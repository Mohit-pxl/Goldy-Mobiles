const { OAuth2Client } = require('google-auth-library');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

/**
 * Verifies a Google ID token and returns the payload (email, name, sub, picture, etc.)
 * @param {string} idToken - The Google ID token from the mobile app
 * @returns {Promise<Object>} - The verified token payload
 */
const verifyGoogleToken = async (idToken) => {
  const ticket = await googleClient.verifyIdToken({
    idToken,
    audience: process.env.GOOGLE_CLIENT_ID,
  });
  return ticket.getPayload();
};

module.exports = { googleClient, verifyGoogleToken };
