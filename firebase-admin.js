const admin = require('firebase-admin');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

function getServiceAccountSync() {
  const keyPath = path.join(__dirname, 'serviceAccountKey.json');
  if (fs.existsSync(keyPath)) {
    try {
      return JSON.parse(fs.readFileSync(keyPath, 'utf8'));
    } catch (e) {}
  }
  return null;
}

function initializeFirebaseAdmin() {
  if (admin.apps.length > 0) return admin;

  const syncAccount = getServiceAccountSync();
  if (syncAccount) {
    admin.initializeApp({ credential: admin.credential.cert(syncAccount) });
    console.log("🚀 Firebase Admin initialized synchronously from serviceAccountKey.json!");
    return admin;
  }

  const dbPath = path.join(__dirname, 'database.sqlite');
  if (fs.existsSync(dbPath)) {
    const db = new sqlite3.Database(dbPath);
    db.get('SELECT value FROM settings WHERE key = ?', ['fcm_service_account'], (err, row) => {
      if (!err && row && row.value) {
        try {
          const serviceAccount = JSON.parse(row.value);
          if (admin.apps.length === 0) {
            admin.initializeApp({
              credential: admin.credential.cert(serviceAccount)
            });
            console.log("🚀 Firebase Admin initialized successfully from DB credentials!");
          }
        } catch (e) {
          console.error("Failed to parse Firebase Admin service account JSON from DB:", e.message);
        }
      }
      db.close();
    });
  }
  return admin;
}

initializeFirebaseAdmin();

admin.ensureInitialized = function() {
  if (admin.apps.length > 0) return Promise.resolve(true);

  return new Promise((resolve) => {
    const dbPath = path.join(__dirname, 'database.sqlite');
    if (!fs.existsSync(dbPath)) return resolve(false);
    const db = new sqlite3.Database(dbPath);
    db.get('SELECT value FROM settings WHERE key = ?', ['fcm_service_account'], (err, row) => {
      if (!err && row && row.value) {
        try {
          const serviceAccount = JSON.parse(row.value);
          if (admin.apps.length === 0) {
            admin.initializeApp({
              credential: admin.credential.cert(serviceAccount)
            });
            console.log("🚀 Firebase Admin ensured initialized!");
          }
        } catch (e) {}
      }
      db.close();
      resolve(admin.apps.length > 0);
    });
  });
};

module.exports = admin;
