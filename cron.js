const cron = require('node-cron');
const nodemailer = require('nodemailer');
const db = require('./db');

async function initMailer() {
  return new Promise((resolve) => {
    db.all('SELECT * FROM settings WHERE key IN ("smtpHost", "smtpPort", "smtpUser", "smtpPass")', async (err, rows) => {
      let config = {};
      if (!err && rows) {
        rows.forEach(r => config[r.key] = r.value);
      }
      
      if (config.smtpHost && config.smtpUser && config.smtpPass) {
        console.log('[Cron] Using custom SMTP configuration from DB.');
        resolve(nodemailer.createTransport({
          host: config.smtpHost,
          port: parseInt(config.smtpPort) || 587,
          secure: parseInt(config.smtpPort) === 465,
          auth: {
            user: config.smtpUser,
            pass: config.smtpPass,
          },
        }));
      } else {
        console.log('[Cron] Custom SMTP not found. Using Ethereal fallback.');
        let testAccount = await nodemailer.createTestAccount();
        resolve(nodemailer.createTransport({
          host: testAccount.smtp.host,
          port: testAccount.smtp.port,
          secure: testAccount.smtp.secure,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass,
          },
        }));
      }
    });
  });
}

let jobsStatus = {
  dailyDigest: { lastRun: null, status: 'idle' },
  gmpSync: { lastRun: null, status: 'idle' }
};

async function runDailyDigest() {
  console.log('[Cron] Running daily IPO digest...');
  jobsStatus.dailyDigest.status = 'running';
  jobsStatus.dailyDigest.lastRun = new Date().toISOString();
  
  return new Promise((resolve) => {
    db.all('SELECT * FROM users', async (err, users) => {
        if (err || !users) {
          jobsStatus.dailyDigest.status = 'error';
          return resolve();
        }
        
        let allFcmTokens = [];
        
        try {
           const transporter = await initMailer();
           for(const user of users) {
               if (user.fcmTokens) {
                   try {
                       const t = JSON.parse(user.fcmTokens);
                       allFcmTokens = allFcmTokens.concat(t);
                   } catch(e) {}
               }

               if(!user.email) continue;
               const info = await transporter.sendMail({
                   from: '"IPO Tracker Alerts" <alert@ipotracker.com>',
                   to: user.email,
                   subject: "Your Daily IPO Digest",
                   text: "Log in to check the dashboard for new IPO listings today!",
                   html: "<b>Log in to check the dashboard for new IPO listings today!</b>",
               });
               console.log(`[Cron] Preview URL for ${user.username}: %s`, nodemailer.getTestMessageUrl(info));
           }

           if (allFcmTokens.length > 0) {
               const admin = require('./firebase-admin');
               const message = {
                   notification: { title: 'Daily IPO Digest', body: 'Check the dashboard for new IPO listings today!' },
                   tokens: [...new Set(allFcmTokens)]
               };
               const response = await admin.messaging().sendEachForMulticast(message);
               console.log(`[Cron] Push Notifications sent. Success: ${response.successCount}, Failure: ${response.failureCount}`);
               
               const crypto = require('crypto');
               db.run(
                   'INSERT INTO notifications_log (id, title, body, sentAt, recipientCount, status, type) VALUES (?, ?, ?, ?, ?, ?, ?)',
                   [crypto.randomUUID(), message.notification.title, message.notification.body, new Date().toISOString(), message.tokens.length, 'success', 'push']
               );
           }
           jobsStatus.dailyDigest.status = 'success';
        } catch(e) {
            console.error('[Cron] Error:', e);
            jobsStatus.dailyDigest.status = 'error';
        }
        resolve();
    });
  });
}

async function runGmpSync() {
  console.log('[Cron] Running Auto-Sync for Live GMP...');
  jobsStatus.gmpSync.status = 'running';
  jobsStatus.gmpSync.lastRun = new Date().toISOString();
  try {
    const res = await fetch('https://finapi.upvaly.com/api/ipo');
    const json = await res.json();
    if (json.status === 'success' && json.data) {
      db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        const stmt = db.prepare(`
          UPDATE records 
          SET gmp = ?, profit = ? 
          WHERE ipoName LIKE ? AND (listingPrice IS NULL OR listingPrice = 0 OR listingPrice = '')
        `);

        let updateCount = 0;
        json.data.forEach(ipo => {
          const gmpStr = ipo.greyMarketPremium?.gmpTrends?.[0]?.gmp;
          if (gmpStr) {
            const gmpNum = parseFloat(gmpStr.replace(/[^\d.-]/g, ''));
            if (!isNaN(gmpNum)) {
              db.run(`
                UPDATE records 
                SET gmp = ?, profit = (? * CAST(lotSize AS REAL))
                WHERE ipoName = ? AND (listingPrice IS NULL OR listingPrice = 0 OR listingPrice = '')
              `, [gmpNum, gmpNum, ipo.ipoName]);
              updateCount++;
            }
          }
        });

        stmt.finalize();
        db.run('COMMIT', (err) => {
          if (err) {
              console.error('[Cron] GMP Auto-Sync commit error:', err.message);
              jobsStatus.gmpSync.status = 'error';
          } else {
              console.log(`[Cron] GMP Auto-Sync completed successfully. Processed ${updateCount} live IPOs.`);
              jobsStatus.gmpSync.status = 'success';
          }
        });
      });
    } else {
        jobsStatus.gmpSync.status = 'error';
    }
  } catch(e) {
    console.error('[Cron] Error fetching Live GMP for auto-sync:', e);
    jobsStatus.gmpSync.status = 'error';
  }
}

function startCronJobs() {
  cron.schedule('0 9 * * *', runDailyDigest);
  console.log('[Cron] Job scheduled: Daily IPO Digest (Ethereal test mode active).');

  cron.schedule('0 * * * *', runGmpSync);
  console.log('[Cron] Job scheduled: Auto-Sync Live GMP (Hourly).');
}

module.exports = { startCronJobs, runDailyDigest, runGmpSync, jobsStatus };

