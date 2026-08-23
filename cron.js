const cron = require('node-cron');
const nodemailer = require('nodemailer');
const db = require('./db');

async function initMailer() {
  return new Promise((resolve) => {
    db.all("SELECT * FROM settings WHERE key IN ('smtpHost', 'smtpPort', 'smtpUser', 'smtpPass')", async (err, rows) => {
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
      db.run('BEGIN TRANSACTION', [], (beginErr) => {
        if (beginErr) {
          console.error('[Cron] GMP Auto-Sync begin error:', beginErr.message);
          jobsStatus.gmpSync.status = 'error';
          return;
        }

        let updateCount = 0;
        let pending = 0;
        const validIpos = [];

        json.data.forEach(ipo => {
          const gmpStr = ipo.greyMarketPremium?.gmpTrends?.[0]?.gmp;
          const ipoName = ipo.name;
          if (gmpStr && ipoName) {
            const gmpNum = parseFloat(gmpStr.replace(/[^\d.-]/g, ''));
            if (!isNaN(gmpNum)) {
              validIpos.push({ ipoName, gmpNum });
            }
          }
        });

        pending = validIpos.length;

        if (pending === 0) {
          db.run('COMMIT', (commitErr) => {
            if (commitErr) {
              console.error('[Cron] GMP Auto-Sync commit error:', commitErr.message);
              jobsStatus.gmpSync.status = 'error';
            } else {
              console.log('[Cron] GMP Auto-Sync completed successfully. Processed 0 live IPOs.');
              jobsStatus.gmpSync.status = 'success';
            }
          });
          return;
        }

        validIpos.forEach(({ ipoName, gmpNum }) => {
          db.run(`
            UPDATE records 
            SET gmp = ?, profit = (? * CAST(shares AS REAL))
            WHERE ipoName LIKE ? AND (listingPrice IS NULL OR listingPrice = 0 OR listingPrice = '')
          `, [gmpNum, gmpNum, `%${ipoName}%`], (runErr) => {
            updateCount++;
            pending--;
            if (pending === 0) {
              db.run('COMMIT', (commitErr) => {
                if (commitErr) {
                  console.error('[Cron] GMP Auto-Sync commit error:', commitErr.message);
                  jobsStatus.gmpSync.status = 'error';
                } else {
                  console.log(`[Cron] GMP Auto-Sync completed successfully. Processed ${updateCount} live IPOs.`);
                  jobsStatus.gmpSync.status = 'success';
                  
                  // Check GMP alerts after sync
                  checkGmpAlerts(json.data);
                }
              });
            }
          });
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

async function sendTelegramMessage(botToken, chatId, text) {
  if (!botToken || !chatId || !text) return false;
  try {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' })
    });
    const json = await res.json();
    return json.ok === true;
  } catch (err) {
    console.error('[Telegram] Error sending message:', err.message);
    return false;
  }
}

// Feature 3: Check GMP alerts and notify users
async function checkGmpAlerts(ipoData) {
  try {
    db.all('SELECT * FROM gmp_alerts WHERE triggered = 0', [], (err, alerts) => {
      if (err || !alerts || alerts.length === 0) return;

      alerts.forEach(alert => {
        const ipo = ipoData.find(i => i.name && i.name.toLowerCase().includes(alert.ipoName.toLowerCase()));
        if (!ipo) return;

        const gmpStr = ipo.greyMarketPremium?.gmpTrends?.[0]?.gmp;
        if (!gmpStr) return;

        const currentGmp = parseFloat(gmpStr.replace(/[^\d.-]/g, ''));
        if (isNaN(currentGmp)) return;

        const shouldTrigger = (alert.direction === 'above' && currentGmp >= alert.targetGmp)
          || (alert.direction === 'below' && currentGmp <= alert.targetGmp);

        if (shouldTrigger) {
          // Mark as triggered
          db.run('UPDATE gmp_alerts SET triggered = 1 WHERE id = ?', [alert.id]);

          // Send push notification to user
          db.get('SELECT fcmTokens, telegramToken, telegramChatId, telegramAlerts FROM users WHERE id = ?', [alert.userId], (userErr, user) => {
            if (!userErr && user) {
              if (user.fcmTokens) {
                try {
                  const tokens = JSON.parse(user.fcmTokens);
                  if (tokens.length > 0) {
                    const firebaseAdmin = require('./firebase-admin');
                    firebaseAdmin.messaging().sendEachForMulticast({
                      tokens: [...new Set(tokens)],
                      notification: {
                        title: `🔔 GMP Alert: ${alert.ipoName}`,
                        body: `GMP is now ₹${currentGmp} (target was ₹${alert.targetGmp} ${alert.direction})`
                      }
                    }).catch(() => {});
                  }
                } catch(e) {}
              }

              // Send Telegram alert if configured
              if (user.telegramToken && user.telegramChatId && user.telegramAlerts !== 0) {
                sendTelegramMessage(
                  user.telegramToken,
                  user.telegramChatId,
                  `🚀 <b>IPO Tracker Alert: ${alert.ipoName}</b>\n\nLive GMP has reached <b>₹${currentGmp}</b> (Target: ₹${alert.targetGmp} ${alert.direction}).`
                );
              }
            }
          });

          // Also create in-app notification & push SSE realtime alert
          const notifId = require('crypto').randomUUID ? require('crypto').randomUUID() : Date.now().toString();
          const title = `🚀 Realtime GMP Alert: ${alert.ipoName}`;
          const body = `GMP is now ₹${currentGmp} (Target: ₹${alert.targetGmp} ${alert.direction})`;

          db.run(
            'INSERT INTO notifications (id, title, body, userId, sentAt, status) VALUES (?, ?, ?, ?, ?, ?)',
            [notifId, title, body, alert.userId, new Date().toISOString(), 'unread']
          );

          if (global.pushRealtimeNotification) {
            global.pushRealtimeNotification(alert.userId, {
              type: 'gmp_alert',
              id: notifId,
              title,
              body,
              gmp: currentGmp,
              ipoName: alert.ipoName,
              sentAt: new Date().toISOString()
            });
          }

          console.log(`[Cron] GMP Alert triggered for ${alert.ipoName}: ₹${currentGmp} (target: ₹${alert.targetGmp})`);
        }
      });
    });
  } catch(e) {
    console.error('[Cron] GMP Alert check error:', e);
  }
}


// Feature 4: Automated Background Registrar Allotment Poller
async function runAllotmentPoller(targetUserId = null) {
  console.log('[Cron] Running Automated Registrar Allotment Poller...');
  const { checkRegistrarAllotment } = require('./registrars');
  const { sendWhatsAppMessage } = require('./whatsapp');
  const crypto = require('crypto');

  if (!jobsStatus.allotmentPoller) {
    jobsStatus.allotmentPoller = { lastRun: null, status: 'idle' };
  }
  jobsStatus.allotmentPoller.status = 'running';
  jobsStatus.allotmentPoller.lastRun = new Date().toISOString();

  return new Promise((resolve) => {
    let sql = `SELECT * FROM records WHERE (alloted = 'Pending' OR alloted IS NULL OR alloted = '' OR alloted = '0') AND pan IS NOT NULL AND pan != ''`;
    const params = [];
    if (targetUserId) {
      sql += ` AND userId = ?`;
      params.push(targetUserId);
    }

    db.all(sql, params, async (err, pendingRecords) => {
      if (err || !pendingRecords || pendingRecords.length === 0) {
        console.log('[Cron] Allotment Poller: No pending applications found.');
        jobsStatus.allotmentPoller.status = 'success';
        return resolve({ totalChecked: 0, allottedCount: 0, notAllottedCount: 0 });
      }

      let totalChecked = 0;
      let allottedCount = 0;
      let notAllottedCount = 0;

      for (const rec of pendingRecords) {
        try {
          const res = await checkRegistrarAllotment({
            ipoName: rec.ipoName,
            pan: rec.pan,
            registrar: rec.registrar,
            shares: rec.shares,
            price: rec.price
          });

          if (res.checked && res.alloted && res.alloted !== 'Pending') {
            totalChecked++;
            const isAllotted = res.alloted === 'Allotted';
            if (isAllotted) allottedCount++; else notAllottedCount++;

            // Update database record
            db.run(
              `UPDATE records SET alloted = ?, holdingStatus = ?, refundStatus = ? WHERE id = ?`,
              [res.alloted, isAllotted ? 'Holding' : 'Pending', isAllotted ? 'refunded' : 'pending', rec.id]
            );

            // Fetch user preferences and credentials for alert dispatch
            db.get(
              `SELECT fcmTokens, telegramToken, telegramChatId, telegramAlerts, whatsappNumber, whatsappAlerts, email, username FROM users WHERE id = ?`,
              [rec.userId],
              async (userErr, user) => {
                if (userErr || !user) return;

                const notifTitle = isAllotted ? `🎉 Allotment Won: ${rec.ipoName}` : `❌ Allotment Update: ${rec.ipoName}`;
                const notifBody = res.message;

                // 1. FCM Push Notification
                if (user.fcmTokens) {
                  try {
                    const tokens = JSON.parse(user.fcmTokens);
                    if (tokens.length > 0) {
                      const admin = require('./firebase-admin');
                      if (admin.apps.length > 0) {
                        admin.messaging().sendEachForMulticast({
                          tokens: [...new Set(tokens)],
                          notification: { title: notifTitle, body: notifBody }
                        }).catch(() => {});
                      }
                    }
                  } catch(e) {}
                }

                // 2. Telegram Alert
                if (user.telegramToken && user.telegramChatId && user.telegramAlerts !== 0) {
                  sendTelegramMessage(
                    user.telegramToken,
                    user.telegramChatId,
                    `🚀 <b>IPO Allotment Update</b>\n\n<b>${rec.ipoName}</b> (${rec.applicantName})\nStatus: <b>${res.alloted}</b>\n${res.message}`
                  );
                }

                // 3. WhatsApp Alert
                if (user.whatsappNumber && user.whatsappAlerts !== 0) {
                  sendWhatsAppMessage(user.whatsappNumber, `🚀 *IPO Allotment Update*\n\n*${rec.ipoName}* (${rec.applicantName})\nStatus: *${res.alloted}*\n${res.message}`);
                }

                // 4. In-App Notification Log & SSE Realtime Notification
                const notifId = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString();
                db.run(
                  'INSERT INTO notifications (id, title, body, userId, sentAt, status) VALUES (?, ?, ?, ?, ?, ?)',
                  [notifId, notifTitle, notifBody, rec.userId, new Date().toISOString(), 'unread']
                );

                if (global.pushRealtimeNotification) {
                  global.pushRealtimeNotification(rec.userId, {
                    type: 'allotment_update',
                    id: notifId,
                    title: notifTitle,
                    body: notifBody,
                    ipoName: rec.ipoName,
                    applicantName: rec.applicantName,
                    alloted: res.alloted,
                    sentAt: new Date().toISOString()
                  });
                }
              }
            );
          }
        } catch (e) {
          console.error(`[Cron Poller Item Error]:`, e.message);
        }
      }

      // Log poller session into allotment_poll_logs
      const logId = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString();
      const polledAt = new Date().toISOString();
      db.run(
        `INSERT INTO allotment_poll_logs (id, userId, ipoName, registrar, totalChecked, allottedCount, notAllottedCount, status, details, polledAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [logId, targetUserId || 'SYSTEM_CRON', 'BULK_AUTO_POLL', 'ALL_REGISTRARS', totalChecked, allottedCount, notAllottedCount, 'completed', `Checked ${pendingRecords.length} pending records across registrars`, polledAt]
      );

      jobsStatus.allotmentPoller.status = 'success';
      console.log(`[Cron] Allotment Poller finished. Total: ${totalChecked}, Allotted: ${allottedCount}, Not Allotted: ${notAllottedCount}`);
      resolve({ totalChecked, allottedCount, notAllottedCount });
    });
  });
}

function startCronJobs() {
  cron.schedule('0 9 * * *', runDailyDigest);
  console.log('[Cron] Job scheduled: Daily IPO Digest (Ethereal test mode active).');

  cron.schedule('0 * * * *', runGmpSync);
  console.log('[Cron] Job scheduled: Auto-Sync Live GMP (Hourly).');

  cron.schedule('*/30 * * * *', runAllotmentPoller);
  console.log('[Cron] Job scheduled: Background Allotment Poller (Every 30 mins).');
}

module.exports = { startCronJobs, runDailyDigest, runGmpSync, runAllotmentPoller, sendTelegramMessage, jobsStatus };

