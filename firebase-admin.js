const admin = require('firebase-admin');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Primary embedded service account credential for ipo-tracker-cba4e
const defaultServiceAccount = {
  type: "service_account",
  project_id: "ipo-tracker-cba4e",
  private_key_id: "5733f3a246057ac1ca7ebee38441eb14947934ec",
  private_key: "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDE1Wr1cMHilNjh\ng0XQYqToUCEjSdkJ719c2NH6qr4OoRNEW4aVPksebyh1WDN2uPJvG8IWGj4YytIC\n1ZGhuxHS6Ryh41wP1n10xfhJW9kxBNhVJMwcwbT7LH+DEJNPvrTU49AP1ENmWrO9\n6QhDy56fkMzSdgrMLKdzncForV4kagPHczxQnf14bVbudWBv8az9ZQTz1BWr1sHc\nYQkBXM8j047xDU7CwKXe9Pilz9aTWol7cvcd0MJ/SxZw//hnQF/47GO6zX+b6nLm\n/ckVM8nUegJEbbQA0mWBz+CsmhliCywED/HEM3KIC8Hq6OpG5ItLyAiVyFhvkmdx\nL6i9CbHVAgMBAAECggEAFbUBmDLItw+6QViETQBr9lDL7sPYoy9aYXdp5M6Kqjta\nUBoV5AScLS2OFS7WchvgZJ93jo9zVLGdaoGaD299fjiGF1ZnEzoQ2N1yTcjK0Yya\nvP0TY4J7To3wPAiKbmt2Lto22mAK1NFg7Cs0ZaGhizBhXj51X2H3T5lQuJYSAUrc\nFxq9O82uG8oNXIc2Pcs+q1q0kJ8hSaan1aYhIIC2Par/dez8TohcLRfporNyt1au\nG/usjmI4RAI+671lbeGts8Q6mJ5V9USs/pxWyblhiOprh8ivii65avh/UKVtSGj3\n6xDRRni+p9XQGCBWgGncdXTEjlaxfv+0JKJNd0imKwKBgQDzNVB+zcab5AQX0jKJ\nTk0E9CyjnDSlk46aidwwftVqONFgYiOGeZGjbxr1elbbALOBivi8MLAGt0ZQJtK2\n2GIaDHOh59j7YiGF/rXJYu/5kJsMXjvBECsHWwL7orOfa1KjYEgOefM0NuGWTDCc\nxnrMufmIw96uBu86xI5lAgk+0wKBgQDPL7DsSDTFE4vmYTjFfe5ijj7Y6NbJBnMi\n+PpOqs60TJCw1jLLAzkCIzLxz1LkIdezR3Wo2d3/FuYxEI3yixeZDpoBAGJRDrWG\nBN8NWT9uEdLdzmKRzfxWYzr4g8XbW4klw0vnovFOCnMDwbMpiofJCu+ZXzaNG/+i\nVBlRatdztwKBgGSLyAmEXPWZ4K9QcSAexOylXccODx3c0PnGwMczyFsvvi/Qoss3\neyRMDKMrvrivo4aMw6RZpIxCPMlqI3cAIh6Ow0dOKIBU43MYCGOHiZptVAxa8O0y\nF/fkgmkxrHzdy75LUb7aX9dYUQ7n1LkbvSziPe1yvJ7JsyFinVPY8aWNAoGANZXK\nFnJeY5I4nq8KddmqLAdKLeOamYd3g9YNNwdqSqt6yKG9pVACEJF1/aB3edVe6llT\nDwa6Kd2MT6hObiqXQdjK7/NfekNpo23jGpq4kwk9FmzohXlXCCjF+bxrEd7My92E\n5jX4XwzIznHsmpPfppmTeoFrpHdXWG6T1cDiVGUCgYEA0gxAZO7PSXbVTmkr6B3a\n1IH/JV0cD6imiQfs1Hb5adJHadrLRMDrMVr8NeT+WCjo4iVRjTCd1v3mZ7HSju6I\nKmENbEH4xRhZDu7n7jpYYXp3sB8oKF8dgB2rrJdkGsbZLJ427idPmE6orDF1elAs\nnSXUrM+mBwTmwnUkKrfkUSM=\n-----END PRIVATE KEY-----\n",
  client_email: "firebase-adminsdk-fbsvc@ipo-tracker-cba4e.iam.gserviceaccount.com",
  client_id: "108543333534497921179",
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40ipo-tracker-cba4e.iam.gserviceaccount.com",
  universe_domain: "googleapis.com"
};

function getServiceAccount() {
  // Check env variable
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    } catch (e) {}
  }
  // Check file on disk
  const keyPath = path.join(__dirname, 'serviceAccountKey.json');
  if (fs.existsSync(keyPath)) {
    try {
      return JSON.parse(fs.readFileSync(keyPath, 'utf8'));
    } catch (e) {}
  }
  // Fallback to embedded credential
  return defaultServiceAccount;
}

function initializeFirebaseAdmin() {
  if (admin.apps.length > 0) return admin;

  try {
    const serviceAccount = getServiceAccount();
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log("🚀 Firebase Admin initialized synchronously with credential!");
  } catch (err) {
    console.error("Firebase Admin sync init error:", err.message);
  }
  return admin;
}

initializeFirebaseAdmin();

admin.ensureInitialized = function() {
  if (admin.apps.length === 0) {
    initializeFirebaseAdmin();
  }
  return Promise.resolve(admin.apps.length > 0);
};

module.exports = admin;
