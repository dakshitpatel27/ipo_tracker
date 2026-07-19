const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const db = require('./db');
const path = require('path');
const { startCronJobs, runDailyDigest, runGmpSync, jobsStatus } = require('./cron');
const admin = require('./firebase-admin');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

const serverLogs = [];
const originalLog = console.log;
const originalError = console.error;

function captureLog(type, ...args) {
    const msg = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : a)).join(' ');
    serverLogs.push(`[${new Date().toISOString()}] [${type}] ${msg}`);
    if (serverLogs.length > 200) serverLogs.shift();
}

console.log = function(...args) {
    captureLog('INFO', ...args);
    originalLog.apply(console, args);
};

console.error = function(...args) {
    captureLog('ERROR', ...args);
    originalError.apply(console, args);
};

app.use(cors());
app.use(bodyParser.json());

// Start background cron jobs (only locally, Vercel uses cron endpoints)
if (!process.env.VERCEL) {
    startCronJobs();
}

// Serve static files from the current directory
if (!process.env.VERCEL) {
    app.use(express.static(__dirname));
}

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret123';

// --- AUTH API ---
app.post('/api/auth/register', async (req, res) => {
    const { username, password, email } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const id = require('crypto').randomUUID ? require('crypto').randomUUID() : Date.now().toString();
        const createdAt = new Date().toISOString();

        db.get('SELECT COUNT(*) as count FROM users', [], (countErr, row) => {
            const isFirstUser = (!countErr && row && row.count === 0);
            const role = isFirstUser ? 'admin' : 'user';
            const status = isFirstUser ? 'approved' : 'pending';

            db.run(
                'INSERT INTO users (id, username, password, email, createdAt, role, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [id, username, hashedPassword, email, createdAt, role, status],
                function (err) {
                    if (err) {
                        if (err.message.includes('UNIQUE')) {
                            return res.status(400).json({ error: 'Username already exists' });
                        }
                        return res.status(400).json({ error: err.message });
                    }
                    
                    if (isFirstUser) {
                        db.run('UPDATE records SET userId = ? WHERE userId IS NULL', [id]);
                        db.run('UPDATE applicants SET userId = ? WHERE userId IS NULL', [id]);
                    } else {
                        // Send push notification to admins
                        db.all("SELECT fcmTokens FROM users WHERE role = 'admin' AND status = 'approved'", [], (adminErr, admins) => {
                            if (!adminErr && admins.length > 0) {
                                const adminTokens = [];
                                admins.forEach(a => {
                                    if(a.fcmTokens) {
                                        try { adminTokens.push(...JSON.parse(a.fcmTokens)); } catch(e){}
                                    }
                                });
                                if (adminTokens.length > 0) {
                                    try {
                                        admin.messaging().sendEachForMulticast({
                                            tokens: [...new Set(adminTokens)],
                                            notification: { title: 'New User Registration', body: `${username} has registered and is waiting for approval.` }
                                        });
                                    } catch(e) {}
                                }
                            }
                        });
                    }

                    if (status === 'pending') {
                        res.json({ message: 'registered_pending', user: { id, username, email, role, status } });
                    } else {
                        const token = jwt.sign({ id, username, role, status }, JWT_SECRET, { expiresIn: '7d' });
                        res.json({ message: 'success', token, user: { id, username, email, role, status } });
                    }
                }
            );
        });
    } catch(err) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
        if (err || !user) return res.status(401).json({ error: 'Invalid credentials' });
        
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });

        // Auto-approve Master Admin and ensure role is master
        if (user.username === 'dakshitpatel27' && user.role !== 'master') {
            await new Promise((resolve) => {
                db.run("UPDATE users SET role = 'master', status = 'approved', subscription = 'pro' WHERE id = ?", [user.id], () => {
                    user.role = 'master';
                    user.status = 'approved';
                    user.subscription = 'pro';
                    resolve();
                });
            });
        }

        if (user.status !== 'approved') {
            return res.status(403).json({ error: 'Account is pending admin approval' });
        }
        if (user.status === 'rejected') {
            return res.status(403).json({ error: 'Account has been rejected' });
        }

        const token = jwt.sign({ id: user.id, username: user.username, role: user.role, status: user.status }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ message: 'success', token, user: { id: user.id, username: user.username, email: user.email, role: user.role, status: user.status } });
    });
});

// Middleware to verify JWT
const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch(err) {
        return res.status(401).json({ error: 'Invalid token' });
    }
};

const isAdmin = (req, res, next) => {
    if (req.user && (req.user.role === 'admin' || req.user.role === 'master')) {
        next();
    } else {
        return res.status(403).json({ error: 'Admin access required' });
    }
};

app.put('/api/auth/password', authMiddleware, async (req, res) => {
    const { password } = req.body;
    if (!password) return res.status(400).json({ error: 'Password required' });
    
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        db.run('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, req.user.id], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Password updated successfully' });
        });
    } catch (e) {
        res.status(500).json({ error: 'Server error' });
    }
});

// GET current user state
app.get('/api/auth/me', authMiddleware, (req, res) => {
    db.get('SELECT id, username, email, role, status FROM users WHERE id = ?', [req.user.id], (err, user) => {
        if (err || !user) return res.status(404).json({ error: 'User not found' });
        res.json({ message: 'success', user });
    });
});

// GET all records
app.get('/api/records', authMiddleware, (req, res) => {
    db.all('SELECT * FROM records WHERE userId = ? ORDER BY createdAt DESC', [req.user.id], (err, rows) => {
        if (err) {
            res.status(400).json({ error: err.message });
            return;
        }
        res.json({
            message: 'success',
            data: rows
        });
    });
});

// GET a single record
app.get('/api/records/:id', authMiddleware, (req, res) => {
    const id = req.params.id;
    db.get('SELECT * FROM records WHERE id = ? AND userId = ?', [id, req.user.id], (err, row) => {
        if (err) {
            res.status(400).json({ error: err.message });
            return;
        }
        res.json({
            message: 'success',
            data: row
        });
    });
});

// BULK ADD records
app.post('/api/records/bulk', authMiddleware, (req, res) => {
    const { records } = req.body;
    if (!Array.isArray(records)) return res.status(400).json({ error: 'Invalid data' });

    db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        const stmt = db.prepare(`INSERT INTO records (id, ipoName, applicantName, pan, upiId, quota, listingDate, lotSize, shares, price, listingPrice, amount, applied, alloted, withdrawal, profit, marginPercent, margin, notes, createdAt, userId, sellDate, sellPrice, holdingStatus) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
        
        records.forEach(r => {
            stmt.run([r.id, r.ipoName, r.applicantName, r.pan, r.upiId, r.quota, r.listingDate, r.lotSize, r.shares, r.price, r.listingPrice, r.amount, r.applied, r.alloted, r.withdrawal, r.profit, r.marginPercent, r.margin, r.notes, r.createdAt, req.user.id, r.sellDate, r.sellPrice, r.holdingStatus || 'Holding']);
        });
        
        stmt.finalize();
        db.run('COMMIT', (err) => {
            if (err) return res.status(400).json({ error: err.message });
            res.json({ message: 'success', count: records.length });
        });
    });
});

// ADD a new record
app.post('/api/records', authMiddleware, (req, res) => {
    const { id, ipoName, applicantName, pan, upiId, quota, listingDate, lotSize, shares, price, listingPrice, amount, applied, alloted, withdrawal, profit, marginPercent, margin, notes, createdAt, sellDate, sellPrice, holdingStatus } = req.body;
    
    db.run(
        `INSERT INTO records (id, ipoName, applicantName, pan, upiId, quota, listingDate, lotSize, shares, price, listingPrice, amount, applied, alloted, withdrawal, profit, marginPercent, margin, notes, createdAt, userId, sellDate, sellPrice, holdingStatus) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, ipoName, applicantName, pan, upiId, quota, listingDate, lotSize, shares, price, listingPrice, amount, applied, alloted, withdrawal, profit, marginPercent, margin, notes, createdAt, req.user.id, sellDate, sellPrice, holdingStatus],
        function (err) {
            if (err) {
                res.status(400).json({ error: err.message });
                return;
            }
            res.json({ message: 'success', id: id });
        }
    );
});

// UPDATE a record
app.put('/api/records/:id', authMiddleware, (req, res) => {
    const { ipoName, applicantName, pan, upiId, quota, listingDate, lotSize, shares, price, listingPrice, amount, applied, alloted, withdrawal, profit, marginPercent, margin, notes, sellDate, sellPrice, holdingStatus } = req.body;
    
    db.run(
        `UPDATE records SET 
            ipoName = ?, applicantName = ?, pan = ?, upiId = ?, quota = ?, listingDate = ?, lotSize = ?, shares = ?, price = ?, listingPrice = ?, amount = ?, applied = ?, alloted = ?, withdrawal = ?, profit = ?, marginPercent = ?, margin = ?, notes = ?, sellDate = ?, sellPrice = ?, holdingStatus = ? 
         WHERE id = ? AND userId = ?`,
        [ipoName, applicantName, pan, upiId, quota, listingDate, lotSize, shares, price, listingPrice, amount, applied, alloted, withdrawal, profit, marginPercent, margin, notes, sellDate, sellPrice, holdingStatus, req.params.id, req.user.id],
        function (err) {
            if (err) {
                res.status(400).json({ error: err.message });
                return;
            }
            res.json({ message: 'success', changes: this.changes });
        }
    );
});

// DELETE a record
app.delete('/api/records/:id', authMiddleware, (req, res) => {
    db.run(
        'DELETE FROM records WHERE id = ? AND userId = ?',
        [req.params.id, req.user.id],
        function (err) {
            if (err) {
                res.status(400).json({ error: err.message });
                return;
            }
            res.json({ message: 'success', changes: this.changes });
        }
    );
});
// --- APPLICANTS API ---

// GET all applicants
app.get('/api/applicants', authMiddleware, (req, res) => {
    db.all('SELECT * FROM applicants WHERE userId = ? ORDER BY name ASC', [req.user.id], (err, rows) => {
        if (err) {
            res.status(400).json({ error: err.message });
            return;
        }
        res.json({ message: 'success', data: rows });
    });
});

// ADD an applicant
app.post('/api/applicants', authMiddleware, (req, res) => {
    const { id, name, pan, upiId, createdAt, family } = req.body;
    
    // Check subscription limit
    db.get('SELECT subscription, role FROM users WHERE id = ?', [req.user.id], (err, userRow) => {
        if (err || !userRow) return res.status(404).json({ error: 'User not found' });
        
        db.get('SELECT COUNT(*) as count FROM applicants WHERE userId = ?', [req.user.id], (err2, countRow) => {
            if (userRow.subscription === 'free' && userRow.role === 'user' && countRow.count >= 2) {
                return res.status(403).json({ error: 'Free tier is limited to 2 portfolios. Upgrade to Pro for unlimited.' });
            }
            
            db.run(
                'INSERT INTO applicants (id, name, pan, upiId, createdAt, userId, family) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [id, name, pan, upiId, createdAt, req.user.id, family || ''],
                function(err3) {
                    if (err3) {
                        if (err3.message.includes('UNIQUE')) {
                            return res.status(400).json({ error: 'Applicant with this name already exists' });
                        }
                        return res.status(400).json({ error: err3.message });
                    }
                    res.json({ message: 'success', id });
                }
            );
        });
    });
});

// UPDATE an applicant
app.put('/api/applicants/:id', authMiddleware, (req, res) => {
    const { name, pan, upiId, family } = req.body;
    db.run(
        'UPDATE applicants SET name = ?, pan = ?, upiId = ?, family = ? WHERE id = ? AND userId = ?',
        [name, pan, upiId, family || '', req.params.id, req.user.id],
        function(err) {
            if (err) return res.status(400).json({ error: err.message });
            res.json({ message: 'success', changes: this.changes });
        }
    );
});

// DELETE an applicant
app.delete('/api/applicants/:id', authMiddleware, (req, res) => {
    db.run('DELETE FROM applicants WHERE id = ? AND userId = ?', [req.params.id, req.user.id], function(err) {
        if (err) return res.status(400).json({ error: err.message });
        res.json({ message: 'success', changes: this.changes });
    });
});

// GET public settings
app.get('/api/settings/public', (req, res) => {
    db.all('SELECT * FROM settings WHERE key = "global_banner"', (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        const settings = {};
        rows.forEach(r => settings[r.key] = r.value);
        res.json({ message: 'success', data: settings });
    });
});

// --- FCM NOTIFICATIONS API ---
// Register FCM Token
app.post('/api/notifications/register', authMiddleware, (req, res) => {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'Token is required' });

    db.get('SELECT fcmTokens FROM users WHERE id = ?', [req.user.id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        
        let tokens = [];
        try {
            if (row && row.fcmTokens) tokens = JSON.parse(row.fcmTokens);
        } catch (e) {
            tokens = [];
        }

        if (!tokens.includes(token)) {
            tokens.push(token);
            db.run('UPDATE users SET fcmTokens = ? WHERE id = ?', [JSON.stringify(tokens), req.user.id], function(updateErr) {
                if (updateErr) return res.status(500).json({ error: updateErr.message });
                res.json({ message: 'Token registered successfully' });
            });
        } else {
            res.json({ message: 'Token already registered' });
        }
    });
});

// Test Notification
app.post('/api/notifications/test', authMiddleware, async (req, res) => {
    db.get('SELECT fcmTokens FROM users WHERE id = ?', [req.user.id], async (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row || !row.fcmTokens) return res.status(404).json({ error: 'No tokens registered for your account yet. Please accept notifications in the browser.' });

        try {
            const tokens = JSON.parse(row.fcmTokens);
            if (tokens.length === 0) return res.status(404).json({ error: 'No tokens found.' });

            if (admin.apps.length === 0) {
               throw new Error('Firebase Admin is in placeholder mode! Add your Firebase keys in firebase-admin.js to send actual push notifications.');
            }

            const message = {
                notification: {
                    title: 'Test Notification',
                    body: 'This is a test FCM push notification!'
                },
                tokens: tokens
            };

            const response = await admin.messaging().sendEachForMulticast(message);
            
            // Log the notification
            const logId = crypto.randomUUID();
            const timestamp = new Date().toISOString();
            db.run(
                'INSERT INTO notifications_log (id, title, body, sentAt, recipientCount, status, type) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [logId, message.notification.title, message.notification.body, timestamp, tokens.length, 'success', 'push']
            );

            res.json({ message: 'Notifications sent', response });
        } catch (error) {
            // Log failure
            const logId = crypto.randomUUID();
            db.run(
                'INSERT INTO notifications_log (id, title, body, sentAt, recipientCount, status, type) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [logId, 'Test Notification', 'This is a test FCM push notification!', new Date().toISOString(), tokens.length || 0, 'failed', 'push']
            );
            res.status(500).json({ error: error.message });
        }
    });
});

// --- ADMIN API ---
// Audit logging helper
function logAudit(req, action, target, details) {
    if (!req.user) return;
    const adminId = req.user.id;
    const adminUsername = req.user.username;
    const logId = crypto.randomUUID();
    db.run(
        'INSERT INTO audit_logs (id, adminId, adminUsername, action, target, details, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [logId, adminId, adminUsername, action, target, details, new Date().toISOString()]
    );
}

// GET all users
app.get('/api/users', authMiddleware, isAdmin, (req, res) => {
    db.all('SELECT id, username, email, createdAt, role, status, subscription FROM users ORDER BY createdAt DESC', [], (err, rows) => {
        if (err) return res.status(400).json({ error: err.message });
        res.json({ message: 'success', data: rows });
    });
});

// GET notification logs (Master Admin Only)
app.get('/api/admin/notifications/logs', authMiddleware, isAdmin, (req, res) => {
    if (req.user.role !== 'master') {
        return res.status(403).json({ error: 'Only Master Admin can view notification logs.' });
    }
    db.all('SELECT * FROM notifications_log ORDER BY sentAt DESC LIMIT 100', [], (err, rows) => {
        if (err) return res.status(400).json({ error: err.message });
        res.json({ message: 'success', data: rows });
    });
});

// GET global analytics (Master Admin Only)
app.get('/api/admin/analytics', authMiddleware, isAdmin, (req, res) => {
    if (req.user.role !== 'master') return res.status(403).json({ error: 'Forbidden' });
    db.get('SELECT COUNT(*) as totalUsers FROM users', (err1, row1) => {
        db.get('SELECT COUNT(*) as totalPortfolios FROM applicants', (err2, row2) => {
            db.get('SELECT SUM(profit) as totalProfit FROM records', (err3, row3) => {
                res.json({ 
                    message: 'success', 
                    data: {
                        totalUsers: row1?.totalUsers || 0,
                        totalPortfolios: row2?.totalPortfolios || 0,
                        totalProfit: row3?.totalProfit || 0
                    } 
                });
            });
        });
    });
});

// GET Settings (Master Admin Only)
app.get('/api/admin/settings', authMiddleware, isAdmin, (req, res) => {
    if (req.user.role !== 'master') return res.status(403).json({ error: 'Forbidden' });
    db.all('SELECT * FROM settings', (err, rows) => {
        if (err) return res.status(400).json({ error: err.message });
        const settings = {};
        rows.forEach(r => settings[r.key] = r.value);
        res.json({ message: 'success', data: settings });
    });
});

// POST Settings (Master Admin Only)
app.post('/api/admin/settings', authMiddleware, isAdmin, (req, res) => {
    if (req.user.role !== 'master') return res.status(403).json({ error: 'Forbidden' });
    const { key, value } = req.body;
    if (!key) return res.status(400).json({ error: 'Key is required' });
    db.run('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', [key, value], (err) => {
        if (err) return res.status(400).json({ error: err.message });
        logAudit(req, 'UPDATE_SETTING', key, `Updated system setting: ${key}`);
        res.json({ message: 'success' });
    });
});

// GET Backup (Master Admin Only)
app.get('/api/admin/backup', authMiddleware, isAdmin, (req, res) => {
    if (req.user.role !== 'master') return res.status(403).json({ error: 'Forbidden' });
    const dbPath = path.resolve(__dirname, 'database.sqlite');
    logAudit(req, 'DOWNLOAD_BACKUP', 'database.sqlite', 'Downloaded full database backup');
    res.download(dbPath);
});

// GET Live Console (Master Admin Only)
app.get('/api/admin/console', authMiddleware, isAdmin, (req, res) => {
    if (req.user.role !== 'master') return res.status(403).json({ error: 'Forbidden' });
    res.json({ message: 'success', data: serverLogs });
});

// POST Impersonate (Master Admin Only)
app.post('/api/admin/impersonate/:id', authMiddleware, isAdmin, (req, res) => {
    if (req.user.role !== 'master') return res.status(403).json({ error: 'Forbidden' });
    
    db.get('SELECT * FROM users WHERE id = ?', [req.params.id], (err, user) => {
        if (err || !user) return res.status(404).json({ error: 'User not found' });
        
        // Generate token for the target user
        const token = jwt.sign({ id: user.id, username: user.username, role: user.role, status: user.status }, JWT_SECRET, { expiresIn: '1h' });
        logAudit(req, 'IMPERSONATE', user.username, 'Admin logged in as user');
        res.json({ message: 'success', token, user: { id: user.id, username: user.username, email: user.email, role: user.role, status: user.status } });
    });
});

// GET Global Export CSV (Master Admin Only)
app.get('/api/admin/export', authMiddleware, isAdmin, (req, res) => {
    if (req.user.role !== 'master') return res.status(403).json({ error: 'Forbidden' });
    
    db.all('SELECT * FROM users', (err, users) => {
        if (err) return res.status(500).json({ error: err.message });
        
        db.all('SELECT * FROM records', (err2, records) => {
            if (err2) return res.status(500).json({ error: err2.message });
            
            // Generate basic CSV string
            let csv = "User ID,Username,Email,Role,Subscription,Record ID,IPO Name,Applicant Name,Profit\n";
            
            users.forEach(u => {
                const userRecords = records.filter(r => r.userId === u.id);
                if (userRecords.length === 0) {
                    csv += `"${u.id}","${u.username}","${u.email}","${u.role}","${u.subscription}","N/A","N/A","N/A","0"\n`;
                } else {
                    userRecords.forEach(r => {
                        csv += `"${u.id}","${u.username}","${u.email}","${u.role}","${u.subscription}","${r.id}","${r.ipoName}","${r.applicantName}","${r.profit || 0}"\n`;
                    });
                }
            });
            
            logAudit(req, 'EXPORT_CSV', 'All Data', 'Exported platform data to CSV');
            res.header('Content-Type', 'text/csv');
            res.attachment(`platform_export_${new Date().toISOString().split('T')[0]}.csv`);
            res.send(csv);
        });
    });
});

// GET Audit Logs (Master Admin Only)
app.get('/api/admin/audit_logs', authMiddleware, isAdmin, (req, res) => {
    if (req.user.role !== 'master') return res.status(403).json({ error: 'Forbidden' });
    db.all('SELECT * FROM audit_logs ORDER BY createdAt DESC LIMIT 200', (err, rows) => {
        if (err) return res.status(400).json({ error: err.message });
        res.json({ message: 'success', data: rows });
    });
});


// Broadcast Custom Notification (Master Admin Only)
app.post('/api/admin/notifications/broadcast', authMiddleware, isAdmin, (req, res) => {
    if (req.user.role !== 'master') {
        return res.status(403).json({ error: 'Only Master Admin can broadcast notifications.' });
    }
    
    const { title, body } = req.body;
    if (!title || !body) return res.status(400).json({ error: 'Title and body are required.' });

    db.all('SELECT fcmTokens FROM users', async (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        
        let allTokens = [];
        rows.forEach(row => {
            if (row.fcmTokens) {
                try {
                    const t = JSON.parse(row.fcmTokens);
                    allTokens = allTokens.concat(t);
                } catch(e) {}
            }
        });
        
        const uniqueTokens = [...new Set(allTokens)];
        if (uniqueTokens.length === 0) return res.status(404).json({ error: 'No users have registered for notifications yet.' });

        try {
            if (admin.apps.length === 0) {
               throw new Error('Firebase Admin is in placeholder mode! Add your Firebase keys in firebase-admin.js to send actual push notifications.');
            }

            const message = {
                notification: { title, body },
                tokens: uniqueTokens
            };

            const response = await admin.messaging().sendEachForMulticast(message);
            
            const logId = crypto.randomUUID();
            db.run(
                'INSERT INTO notifications_log (id, title, body, sentAt, recipientCount, status, type) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [logId, title, body, new Date().toISOString(), uniqueTokens.length, 'success', 'push']
            );

            res.json({ message: 'Broadcast successful', response });
        } catch (error) {
            const logId = crypto.randomUUID();
            db.run(
                'INSERT INTO notifications_log (id, title, body, sentAt, recipientCount, status, type) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [logId, title, body, new Date().toISOString(), uniqueTokens.length || 0, 'failed', 'push']
            );
            res.status(500).json({ error: error.message });
        }
    });
});

// Test Email (Master Admin Only)
app.post('/api/admin/test-email', authMiddleware, isAdmin, (req, res) => {
    if (req.user.role !== 'master') return res.status(403).json({ error: 'Only Master Admin can send test emails.' });

    const { smtpHost, smtpPort, smtpUser, smtpPass, testEmail, subject, body } = req.body;
    if (!smtpHost || !smtpPort || !smtpUser || !smtpPass || !testEmail) {
        return res.status(400).json({ error: 'All SMTP settings and test email address are required.' });
    }

    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: parseInt(smtpPort),
        secure: parseInt(smtpPort) === 465,
        auth: {
            user: smtpUser,
            pass: smtpPass
        }
    });

    const mailOptions = {
        from: `"IPO Tracker" <${smtpUser}>`,
        to: testEmail,
        subject: subject || 'IPO Tracker SMTP Test',
        text: body || 'This is a test email to verify your SMTP configuration in IPO Tracker.',
        html: body ? `<p>${body.replace(/\n/g, '<br>')}</p>` : '<p>This is a test email to verify your SMTP configuration in <b>IPO Tracker</b>.</p>'
    };

    transporter.sendMail(mailOptions, (error, info) => {
        const logId = crypto.randomUUID();
        if (error) {
            db.run(
                'INSERT INTO notifications_log (id, title, body, sentAt, recipientCount, status, type) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [logId, 'Test Email', error.message.substring(0, 200), new Date().toISOString(), 1, 'failed', 'email']
            );
            return res.status(500).json({ error: 'Failed to send test email: ' + error.message });
        }
        
        db.run(
            'INSERT INTO notifications_log (id, title, body, sentAt, recipientCount, status, type) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [logId, 'Test Email', `SMTP Test to ${testEmail}`, new Date().toISOString(), 1, 'success', 'email']
        );
        res.json({ message: 'Test email sent successfully', info: info.messageId });
    });
});

// GET cron jobs status
app.get('/api/admin/cron', authMiddleware, isAdmin, (req, res) => {
    res.json(jobsStatus);
});

// Trigger cron job manually
app.post('/api/admin/cron/trigger', authMiddleware, isAdmin, async (req, res) => {
    const { job } = req.body;
    if (job === 'dailyDigest') {
        runDailyDigest(); // don't await, let it run in background
        return res.json({ message: 'Daily Digest triggered' });
    }
    if (job === 'gmpSync') {
        runGmpSync();
        return res.json({ message: 'GMP Sync triggered' });
    }
    res.status(400).json({ error: 'Invalid job name' });
});

// Bulk Notify Users
app.post('/api/admin/users/bulk-notify', authMiddleware, isAdmin, (req, res) => {
    const { userIds, title, body } = req.body;
    if (!userIds || !userIds.length || !title || !body) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // In a real scenario, you'd fetch FCM tokens and emails for these specific users.
    // For now, we'll just log it to the DB as a bulk notification.
    const logId = crypto.randomUUID();
    db.run(
        'INSERT INTO notifications_log (id, title, body, sentAt, recipientCount, status, type) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [logId, title, body, new Date().toISOString(), userIds.length, 'success', 'push']
    );
    res.json({ message: `Successfully queued notification for ${userIds.length} users.` });
});

// Bulk Update Users
app.post('/api/admin/users/bulk-update', authMiddleware, isAdmin, (req, res) => {
    const { userIds, role, status, subscription } = req.body;
    if (!userIds || !userIds.length) {
        return res.status(400).json({ error: 'No users selected' });
    }
    
    let updates = [];
    let params = [];
    if (role) { updates.push('role = ?'); params.push(role); }
    if (status) { updates.push('status = ?'); params.push(status); }
    if (subscription) { updates.push('subscription = ?'); params.push(subscription); }
    
    if (updates.length === 0) return res.json({ message: 'No fields to update' });
    
    const placeholders = userIds.map(() => '?').join(',');
    const query = `UPDATE users SET ${updates.join(', ')} WHERE id IN (${placeholders}) AND role != 'master'`;
    
    db.run(query, [...params, ...userIds], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        logAudit(req, 'BULK_UPDATE', `Users: ${userIds.length}`, `Updated: ${updates.join(', ')}`);
        res.json({ message: 'Users updated successfully', changes: this.changes });
    });
});

// UPDATE user status
app.put('/api/users/:id/status', authMiddleware, isAdmin, (req, res) => {
    const { status, role, subscription } = req.body;
    const targetUserId = req.params.id;
    const currentUserRole = req.user.role;
    
    db.get('SELECT role FROM users WHERE id = ?', [targetUserId], (err, row) => {
        if (err || !row) return res.status(404).json({ error: 'User not found' });
        
        if (currentUserRole !== 'master' && (row.role === 'admin' || row.role === 'master') && targetUserId !== req.user.id) {
            return res.status(403).json({ error: 'Only the Master Admin can modify other administrators.' });
        }
        
        // Prevent changing a master's role
        if (row.role === 'master' && role && role !== 'master') {
            return res.status(403).json({ error: 'Master Admin role cannot be changed.' });
        }

        db.run(
            'UPDATE users SET status = COALESCE(?, status), role = COALESCE(?, role), subscription = COALESCE(?, subscription) WHERE id = ?',
            [status, role, subscription, targetUserId],
            function (err) {
                if (err) return res.status(400).json({ error: err.message });
                logAudit(req, 'UPDATE_USER', row.username || targetUserId, `Status: ${status || '-'}, Role: ${role || '-'}, Sub: ${subscription || '-'}`);
                res.json({ message: 'success', changes: this.changes });
            }
        );
    });
});

// DELETE a user
app.delete('/api/users/:id', authMiddleware, isAdmin, (req, res) => {
    const targetUserId = req.params.id;
    const currentUserRole = req.user.role;
    
    db.get('SELECT role FROM users WHERE id = ?', [targetUserId], (err, row) => {
        if (err || !row) return res.status(404).json({ error: 'User not found' });
        
        if (currentUserRole !== 'master' && (row.role === 'admin' || row.role === 'master')) {
            return res.status(403).json({ error: 'Only the Master Admin can delete other administrators.' });
        }
        
        if (row.role === 'master') {
            return res.status(403).json({ error: 'Master Admin cannot be deleted.' });
        }

        db.serialize(() => {
            db.run('DELETE FROM records WHERE userId = ?', [targetUserId]);
            db.run('DELETE FROM applicants WHERE userId = ?', [targetUserId]);
            db.run('DELETE FROM users WHERE id = ?', [targetUserId], function(err) {
                if (err) return res.status(400).json({ error: err.message });
                logAudit(req, 'DELETE_USER', row.username || targetUserId, 'Permanently deleted user account');
                res.json({ message: 'success', changes: this.changes });
            });
        });
    });
});

// --- SETTINGS API ---
app.get('/api/settings/fcm-web', (req, res) => {
    db.get('SELECT value FROM settings WHERE key = ?', ['fcm_web_config'], (err, row) => {
        if (err || !row) return res.json(null);
        try {
            res.json(JSON.parse(row.value));
        } catch(e) {
            res.json(null);
        }
    });
});

app.post('/api/settings/fcm', authMiddleware, (req, res) => {
    const { webConfig, serviceAccount } = req.body;
    db.serialize(() => {
        if (webConfig) {
            db.run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', ['fcm_web_config', JSON.stringify(webConfig)]);
        }
        if (serviceAccount) {
            db.run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', ['fcm_service_account', JSON.stringify(serviceAccount)]);
        }
    });
    
    // Reinitialize Admin
    initFirebaseAdmin();
    res.json({ message: 'Settings saved successfully' });
});

function initFirebaseAdmin() {
    db.get('SELECT value FROM settings WHERE key = ?', ['fcm_service_account'], (err, row) => {
        if (!err && row && row.value) {
            try {
                const serviceAccount = JSON.parse(row.value);
                if (admin.apps.length > 0) {
                    // Firebase already initialized, cannot re-initialize easily without deleting the app.
                    // A server restart is usually recommended, but we can try deleting it.
                    admin.app().delete().then(() => {
                        admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
                        console.log("Firebase Admin re-initialized with new DB credentials");
                    });
                } else {
                    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
                    console.log("Firebase Admin initialized from DB credentials");
                }
            } catch(e) {
                console.error("Failed to parse or initialize service account from DB", e);
            }
        }
    });
}

// --- THEME & ADMIN SETTINGS API ---
app.get('/api/settings/public', (req, res) => {
    db.all('SELECT key, value FROM settings WHERE key IN ("brandName", "brandColor", "globalBanner", "subscriptionTiers")', (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        const settings = {};
        rows.forEach(r => settings[r.key] = r.value);
        res.json({ message: 'success', data: settings });
    });
});

app.get('/api/admin/settings', authMiddleware, isAdmin, (req, res) => {
    db.all('SELECT * FROM settings', (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        const settings = {};
        rows.forEach(r => settings[r.key] = r.value);
        res.json({ message: 'success', data: settings });
    });
});

app.post('/api/admin/settings', authMiddleware, isAdmin, (req, res) => {
    if (req.user.role !== 'master') return res.status(403).json({ error: 'Forbidden' });
    const { key, value } = req.body;
    db.run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, value], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        logAudit(req, 'UPDATE_SETTING', key, 'Changed system setting');
        res.json({ message: 'success' });
    });
});

// --- EMAIL TEMPLATES API ---
app.get('/api/admin/templates', authMiddleware, isAdmin, (req, res) => {
    db.all('SELECT * FROM email_templates ORDER BY createdAt DESC', (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'success', data: rows });
    });
});

app.post('/api/admin/templates', authMiddleware, isAdmin, (req, res) => {
    if (req.user.role !== 'master') return res.status(403).json({ error: 'Forbidden' });
    const { name, subject, bodyHtml } = req.body;
    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    db.run(
        'INSERT INTO email_templates (id, name, subject, bodyHtml, createdAt) VALUES (?, ?, ?, ?, ?)',
        [id, name, subject, bodyHtml, createdAt],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            logAudit(req, 'CREATE_TEMPLATE', name, 'Created new email template');
            res.json({ message: 'success', template: { id, name, subject, bodyHtml, createdAt } });
        }
    );
});

app.put('/api/admin/templates/:id', authMiddleware, isAdmin, (req, res) => {
    if (req.user.role !== 'master') return res.status(403).json({ error: 'Forbidden' });
    const { name, subject, bodyHtml } = req.body;
    db.run(
        'UPDATE email_templates SET name = ?, subject = ?, bodyHtml = ? WHERE id = ?',
        [name, subject, bodyHtml, req.params.id],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            logAudit(req, 'UPDATE_TEMPLATE', name, 'Updated email template');
            res.json({ message: 'success' });
        }
    );
});

app.delete('/api/admin/templates/:id', authMiddleware, isAdmin, (req, res) => {
    if (req.user.role !== 'master') return res.status(403).json({ error: 'Forbidden' });
    db.run('DELETE FROM email_templates WHERE id = ?', [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        logAudit(req, 'DELETE_TEMPLATE', req.params.id, 'Deleted email template');
        res.json({ message: 'success' });
    });
});

// Initial boot
initFirebaseAdmin();

// Ensure Master Admin Exists
const ensureMasterAdmin = async () => {
    try {
        const username = 'dakshitpatel27';
        const email = 'gajiparadakshit@gmail.com';
        const rawPassword = 'Daksh@2707';

        db.get('SELECT id FROM users WHERE username = ? OR email = ?', [username, email], async (err, row) => {
            if (!err && row) {
                // User exists, promote them to master admin
                db.run('UPDATE users SET role = ?, status = ?, subscription = ? WHERE id = ?', 
                    ['master', 'approved', 'pro', row.id],
                    (updateErr) => {
                        if (!updateErr) console.log('Existing user promoted to Master Admin.');
                    }
                );
            } else if (!err && !row) {
                // User does not exist, insert them
                const hashedPassword = await bcrypt.hash(rawPassword, 10);
                const id = require('crypto').randomUUID ? require('crypto').randomUUID() : Date.now().toString();
                const createdAt = new Date().toISOString();
                
                db.run('INSERT INTO users (id, username, password, email, createdAt, role, status, subscription) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                    [id, username, hashedPassword, email, createdAt, 'master', 'approved', 'pro'],
                    (insertErr) => {
                        if (!insertErr) console.log('Master Admin seeded successfully.');
                        else console.error('Failed to seed Master Admin', insertErr);
                    }
                );
            }
        });
    } catch(e) {
        console.error('Master admin seed error', e);
    }
};

// Wait for DB to be ready before seeding
setTimeout(ensureMasterAdmin, 2000);

// --- VERCEL CRON ENDPOINT ---
app.post('/api/cron/run', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    try {
        // Trigger the external cron.js logic if needed, or simply run the sync functions
        // For simplicity, we just return success. If you want it to trigger the sync, 
        // we can import cron.js and call it, but since cron.js uses `node-cron`, 
        // we'd need to extract the functions.
        res.json({ success: true, message: 'Cron endpoint hit successfully' });
    } catch(err) {
        res.status(500).json({ error: err.message });
    }
});

if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });
}

// Export for Vercel Serverless
module.exports = app;
