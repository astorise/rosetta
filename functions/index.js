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
