const { auth, https } = require('firebase-functions/v1');
const { defineString } = require('firebase-functions/params');
const logger = require('firebase-functions/logger');
const { GoogleAuth } = require('google-auth-library');

const cloudRunServiceUrl = defineString('CLOUD_RUN_SERVICE_URL');

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
