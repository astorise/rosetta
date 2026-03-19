const functions = require('firebase-functions');
const { GoogleAuth } = require('google-auth-library');
const fetch = require('node-fetch');

const CLOUD_RUN_SERVICE_URL = process.env.CLOUD_RUN_SERVICE_URL;

exports.triggerCloudRunOnUserCreate = functions.auth.user().onCreate(async (user) => {
  const serviceAudience = CLOUD_RUN_SERVICE_URL;

  functions.logger.info(`New user created: ${user.uid}`);

  try {
    const auth = new GoogleAuth();
    const client = await auth.getIdTokenClient(serviceAudience);

    const body = {
        email: user.email,
        uid: user.uid,
    };

    const response = await client.request({
        url: CLOUD_RUN_SERVICE_URL,
        method: 'POST',
        data: body,
    });

    functions.logger.info('Successfully triggered Cloud Run service.', response.data);
    return response.data;

  } catch (error) {
    functions.logger.error('Error triggering Cloud Run service:', error);
    throw new functions.https.HttpsError('internal', 'Failed to trigger Cloud Run service', error.message);
  }
});
