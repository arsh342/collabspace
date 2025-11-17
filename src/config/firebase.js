const { logger } = require("../middleware/logger");

let admin = null;
let initAttempted = false;

function initFirebaseApp() {
  if (admin || initAttempted) return admin;
  initAttempted = true;

  try {
    // eslint-disable-next-line global-require
    admin = require("firebase-admin");

    if (admin.apps && admin.apps.length) {
      return admin;
    }

    // Prefer GOOGLE_APPLICATION_CREDENTIALS (file path) if available
    const hasFileCreds = !!process.env.GOOGLE_APPLICATION_CREDENTIALS;
    const hasInlineCreds =
      !!process.env.FIREBASE_PROJECT_ID &&
      !!process.env.FIREBASE_CLIENT_EMAIL &&
      !!process.env.FIREBASE_PRIVATE_KEY;

    if (!hasFileCreds && !hasInlineCreds) {
      logger.warn("Firebase admin not configured; skipping init");
      admin = null;
      return null;
    }

    if (hasFileCreds) {
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
      });
    } else if (hasInlineCreds) {
      const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n");
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey,
        }),
      });
    }
  } catch (error) {
    logger.error("Failed to initialize Firebase admin", { message: error.message });
    admin = null;
  }

  return admin;
}

function getFirebaseAdmin() {
  return initFirebaseApp();
}

async function verifyIdToken(idToken) {
  const _admin = getFirebaseAdmin();
  if (!_admin) return null;
  try {
    return await _admin.auth().verifyIdToken(idToken);
  } catch (error) {
    logger.warn("Invalid Firebase ID token", { message: error.message });
    return null;
  }
}

module.exports = {
  getFirebaseAdmin,
  verifyIdToken,
};

