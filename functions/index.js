const { auth, https } = require('firebase-functions/v1');
const { defineString } = require('firebase-functions/params');
const logger = require('firebase-functions/logger');
const { GoogleAuth } = require('google-auth-library');
const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const adminAuth = admin.auth();
const cloudRunServiceUrl = defineString('CLOUD_RUN_SERVICE_URL');
const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;
const SUPPORTED_UPLOAD_EXTENSIONS = new Set(['.pdf', '.zip', '.jar']);

function getRoleFromSnapshot(snapshot) {
  if (!snapshot.exists) {
    return 'reader';
  }

  return snapshot.data()?.role === 'admin' ? 'admin' : 'reader';
}

function serializeAccount(userRecord, role) {
  return {
    uid: userRecord.uid,
    email: userRecord.email ?? null,
    displayName: userRecord.displayName ?? null,
    role,
    disabled: userRecord.disabled,
    emailVerified: userRecord.emailVerified,
    creationTime: userRecord.metadata.creationTime ?? null,
    lastSignInTime: userRecord.metadata.lastSignInTime ?? null,
    providerIds: userRecord.providerData.map((provider) => provider.providerId),
  };
}

function getProjectId() {
  return process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT || admin.app().options.projectId || '';
}

function getRawDocsBucketName() {
  return process.env.RAW_DOCS_BUCKET || `${getProjectId()}-raw-docs`;
}

function getFileExtension(fileName) {
  const normalizedName = typeof fileName === 'string' ? fileName.trim().toLowerCase() : '';
  const match = normalizedName.match(/\.[a-z0-9]+$/);
  return match ? match[0] : '';
}

function sanitizeUploadFileName(fileName) {
  const baseName = String(fileName ?? '')
    .split(/[\\/]/)
    .pop()
    ?.trim() || 'upload.bin';

  const sanitizedName = baseName.replace(/[^a-zA-Z0-9._-]/g, '_');
  return `${Date.now()}_${sanitizedName}`;
}

function normalizeUploadContentType(contentType, extension) {
  const normalizedType = typeof contentType === 'string' ? contentType.trim() : '';

  if (normalizedType) {
    return normalizedType;
  }

  switch (extension) {
    case '.pdf':
      return 'application/pdf';
    case '.zip':
      return 'application/zip';
    case '.jar':
      return 'application/java-archive';
    default:
      return 'application/octet-stream';
  }
}

async function createResumableUploadSession({
  bucketName,
  objectName,
  contentType,
  size,
  uploadedBy,
}) {
  const authClient = new GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/devstorage.read_write'],
  });
  const accessToken = await authClient.getAccessToken();

  if (!accessToken) {
    throw new Error('Unable to acquire a Google Cloud access token.');
  }

  const endpoint = new URL(`https://storage.googleapis.com/upload/storage/v1/b/${bucketName}/o`);
  endpoint.searchParams.set('uploadType', 'resumable');
  endpoint.searchParams.set('name', objectName);

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json; charset=UTF-8',
      'X-Upload-Content-Type': contentType,
      'X-Upload-Content-Length': String(size),
    },
    body: JSON.stringify({
      name: objectName,
      contentType,
      metadata: {
        uploadedBy,
      },
    }),
  });

  if (!response.ok) {
    const responseBody = await response.text();
    throw new Error(
      `Failed to create upload session (${response.status}): ${responseBody || 'empty response'}`
    );
  }

  const sessionUri = response.headers.get('location');

  if (!sessionUri) {
    throw new Error('Cloud Storage did not return a resumable upload URL.');
  }

  return sessionUri;
}

async function ensureAdmin(context) {
  const requesterUid = context.auth?.uid;

  if (!requesterUid) {
    throw new https.HttpsError('unauthenticated', 'Authentication is required.');
  }

  const requesterRoleSnapshot = await db.collection('user_roles').doc(requesterUid).get();
  const requesterRole = getRoleFromSnapshot(requesterRoleSnapshot);

  if (requesterRole !== 'admin') {
    throw new https.HttpsError('permission-denied', 'Admin access is required.');
  }

  return requesterUid;
}

async function listAllUsers() {
  const users = [];
  let nextPageToken;

  do {
    const page = await adminAuth.listUsers(1000, nextPageToken);
    users.push(...page.users);
    nextPageToken = page.pageToken;
  } while (nextPageToken);

  return users;
}

exports.createRawUploadSession = https.onCall(async (data, context) => {
  const requesterUid = await ensureAdmin(context);
  const fileName = typeof data?.fileName === 'string' ? data.fileName.trim() : '';
  const size = Number(data?.size);
  const extension = getFileExtension(fileName);

  if (!fileName) {
    throw new https.HttpsError('invalid-argument', 'A file name is required.');
  }

  if (!SUPPORTED_UPLOAD_EXTENSIONS.has(extension)) {
    throw new https.HttpsError(
      'invalid-argument',
      'Only PDF, ZIP, and JAR uploads are supported.'
    );
  }

  if (!Number.isFinite(size) || size <= 0) {
    throw new https.HttpsError('invalid-argument', 'A valid file size is required.');
  }

  if (size > MAX_UPLOAD_BYTES) {
    throw new https.HttpsError(
      'failed-precondition',
      'Files larger than 50MB are not allowed.'
    );
  }

  const objectName = sanitizeUploadFileName(fileName);
  const contentType = normalizeUploadContentType(data?.contentType, extension);
  const bucketName = getRawDocsBucketName();

  try {
    const uploadUrl = await createResumableUploadSession({
      bucketName,
      objectName,
      contentType,
      size,
      uploadedBy: requesterUid,
    });

    logger.info('Created raw upload session.', {
      bucketName,
      objectName,
      requesterUid,
    });

    return {
      bucketName,
      objectName,
      contentType,
      uploadUrl,
    };
  } catch (error) {
    logger.error('Failed to create raw upload session.', error);
    throw new https.HttpsError(
      'internal',
      'Failed to create an upload session.',
      error instanceof Error ? error.message : String(error)
    );
  }
});

exports.triggerCloudRunOnUserCreate = auth.user().onCreate(async (user) => {
  const serviceUrl = cloudRunServiceUrl.value();

  if (!serviceUrl) {
    logger.error('CLOUD_RUN_SERVICE_URL is not configured.');
    throw new https.HttpsError(
      'failed-precondition',
      'CLOUD_RUN_SERVICE_URL is not configured.'
    );
  }

  logger.info(`New user created: ${user.uid}`);

  try {
    const googleAuth = new GoogleAuth();
    const client = await googleAuth.getIdTokenClient(serviceUrl);

    const body = {
      email: user.email ?? null,
      uid: user.uid,
    };

    const response = await client.request({
      url: serviceUrl,
      method: 'POST',
      data: body,
    });

    logger.info('Successfully triggered Cloud Run service.', response.data);
    return response.data;
  } catch (error) {
    logger.error('Error triggering Cloud Run service.', error);
    throw new https.HttpsError(
      'internal',
      'Failed to trigger Cloud Run service',
      error instanceof Error ? error.message : String(error)
    );
  }
});

exports.listAdminAccounts = https.onCall(async (_data, context) => {
  try {
    await ensureAdmin(context);

    const [users, roleSnapshot] = await Promise.all([
      listAllUsers(),
      db.collection('user_roles').get(),
    ]);

    const roleByUid = new Map(
      roleSnapshot.docs.map((doc) => [doc.id, doc.data()?.role === 'admin' ? 'admin' : 'reader'])
    );

    const accounts = users
      .map((userRecord) => serializeAccount(userRecord, roleByUid.get(userRecord.uid) ?? 'reader'))
      .sort((left, right) => {
        const leftTime = left.creationTime ? Date.parse(left.creationTime) : 0;
        const rightTime = right.creationTime ? Date.parse(right.creationTime) : 0;
        return rightTime - leftTime;
      });

    return { accounts };
  } catch (error) {
    logger.error('Failed to list admin accounts.', error);

    if (error instanceof https.HttpsError) {
      throw error;
    }

    throw new https.HttpsError(
      'internal',
      'Failed to list admin accounts.',
      error instanceof Error ? error.message : String(error)
    );
  }
});

exports.updateAdminAccountRole = https.onCall(async (data, context) => {
  const targetUid = typeof data?.uid === 'string' ? data.uid.trim() : '';
  const targetRole = data?.role;

  if (!targetUid) {
    throw new https.HttpsError('invalid-argument', 'A target uid is required.');
  }

  if (targetRole !== 'admin' && targetRole !== 'reader') {
    throw new https.HttpsError(
      'invalid-argument',
      'The role must be either "admin" or "reader".'
    );
  }

  try {
    const requesterUid = await ensureAdmin(context);

    if (requesterUid === targetUid && targetRole !== 'admin') {
      throw new https.HttpsError(
        'failed-precondition',
        'You cannot remove your own admin access from this page.'
      );
    }

    const userRecord = await adminAuth.getUser(targetUid);

    await db.collection('user_roles').doc(targetUid).set(
      {
        role: targetRole,
        email: userRecord.email ?? null,
      },
      { merge: true }
    );

    return {
      account: serializeAccount(userRecord, targetRole),
    };
  } catch (error) {
    logger.error('Failed to update admin account role.', error);

    if (error instanceof https.HttpsError) {
      throw error;
    }

    if (error?.code === 'auth/user-not-found') {
      throw new https.HttpsError('not-found', `No Firebase Auth user exists for uid ${targetUid}.`);
    }

    throw new https.HttpsError(
      'internal',
      'Failed to update the account role.',
      error instanceof Error ? error.message : String(error)
    );
  }
});
