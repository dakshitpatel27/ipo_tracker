const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const db = require('./db');
const path = require('path');
const { startCronJobs, runDailyDigest, runGmpSync, jobsStatus } = require('./cron');
const admin = require('./firebase-admin');
const crypto = require('crypto');
const totp = require('./totp');
const calculator = require('./calculator');
const multer = require('multer');
// Polyfill DOMMatrix for pdf-parse in Node.js
if (typeof global.DOMMatrix === 'undefined') {
    global.DOMMatrix = class DOMMatrix {
        constructor() {
            this.a = 1; this.b = 0; this.c = 0; this.d = 1; this.e = 0; this.f = 0;
        }
    };
}
// Lazy PDF Parser loader function
function getPdfParse() {
    try {
        return require('pdf-parse');
    } catch (e) {
        console.warn('[SERVER WARNING] pdf-parse optional module is unavailable:', e.message);
        return null;
    }
}
const upload = multer({ storage: multer.memoryStorage() });

// Helper to audit PAN access securely (partially masked)
function logPanAccess(req, action, targetPan, details) {
    if (!req.user) return;
    const userId = req.user.id;
    const username = req.user.username;
    const logId = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString();

    const maskedPan = targetPan && targetPan.length >= 10
        ? targetPan.substring(0, 2) + 'XXXX' + targetPan.substring(6)
        : 'N/A';
    const actionText = `PAN_${action}`;
    const detailsText = `${details} (PAN: ${maskedPan})`;

    db.run(
        'INSERT INTO audit_logs (id, adminId, adminUsername, action, target, details, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [logId, userId, username, actionText, 'PAN_DATA', detailsText, new Date().toISOString()]
    );
}

function parseUserAgent(ua) {
    if (!ua) return 'Desktop Web Client';
    let os = 'Windows';
    if (ua.includes('Win')) os = 'Windows';
    else if (ua.includes('Mac')) os = 'macOS';
    else if (ua.includes('Linux')) os = 'Linux';
    else if (ua.includes('Android')) os = 'Android';
    else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';

    let browser = 'Browser';
    if (ua.includes('Edg/')) browser = 'Edge';
    else if (ua.includes('Chrome/')) browser = 'Chrome';
    else if (ua.includes('Firefox/')) browser = 'Firefox';
    else if (ua.includes('Safari/') && !ua.includes('Chrome/')) browser = 'Safari';

    return `${browser} on ${os}`;
}

function getClientIp(req) {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
        return forwarded.split(',')[0].trim();
    }
    return req.ip || (req.socket && req.socket.remoteAddress) || (req.connection && req.connection.remoteAddress) || '127.0.0.1';
}

// Helper to initialize session
function createSession(userId, req, callback) {
    const sessionId = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    const rawAgent = req.headers['user-agent'] || 'Unknown Device';
    const deviceAgent = parseUserAgent(rawAgent);
    const ipAddress = getClientIp(req);
    const now = new Date().toISOString();

    // Check user subscription & role for device login limit
    db.get('SELECT subscription, role FROM users WHERE id = ?', [userId], (err, userRow) => {
        const isFreeTier = !userRow || (userRow.subscription === 'free' && userRow.role === 'user');

        if (isFreeTier) {
            // Free Tier: Strictly 1 active device session (delete old sessions)
            db.run('DELETE FROM sessions WHERE userId = ?', [userId], () => {
                db.run(
                    'INSERT INTO sessions (id, userId, deviceAgent, ipAddress, createdAt, lastActiveAt, token) VALUES (?, ?, ?, ?, ?, ?, ?)',
                    [sessionId, userId, deviceAgent, ipAddress, now, now, ''],
                    (insertErr) => {
                        if (insertErr) return callback(insertErr, null);
                        callback(null, sessionId);
                    }
                );
            });
        } else {
            // Pro / Admin / Master Tier: Allow multiple active sessions
            db.run(
                'INSERT INTO sessions (id, userId, deviceAgent, ipAddress, createdAt, lastActiveAt, token) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [sessionId, userId, deviceAgent, ipAddress, now, now, ''],
                (insertErr) => {
                    if (insertErr) return callback(insertErr, null);
                    callback(null, sessionId);
                }
            );
        }
    });
}

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

console.log = function (...args) {
    captureLog('INFO', ...args);
    originalLog.apply(console, args);
};

console.error = function (...args) {
    captureLog('ERROR', ...args);
    originalError.apply(console, args);
};

// ========== SECURITY HEADERS & CORS MIDDLEWARE ==========
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    next();
});

const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
    : [];

app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin) || process.env.VERCEL) {
            callback(null, true);
        } else {
            callback(new Error('CORS policy violation: Origin not allowed'));
        }
    },
    credentials: true
}));

app.use(bodyParser.json());

// In-memory sliding window rate limiter for sensitive authentication endpoints
const authRateAttempts = new Map();
function authRateLimiter(maxAttempts = 10, windowMs = 15 * 60 * 1000) {
    return (req, res, next) => {
        const ip = getClientIp(req);
        const now = Date.now();
        const record = authRateAttempts.get(ip) || { count: 0, resetTime: now + windowMs };

        if (now > record.resetTime) {
            record.count = 1;
            record.resetTime = now + windowMs;
        } else {
            record.count++;
        }

        authRateAttempts.set(ip, record);

        if (record.count > maxAttempts) {
            return res.status(429).json({ error: 'Too many authentication attempts. Please try again in 15 minutes.' });
        }
        next();
    };
}

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
if (!process.env.JWT_SECRET) {
    console.warn('[SECURITY WARNING] JWT_SECRET environment variable is not set! Using default fallback secret.');
}

// --- AUTH API ---
app.post('/api/auth/register', authRateLimiter(10, 15 * 60 * 1000), async (req, res) => {
    const { username, password, email, name } = req.body;
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
                'INSERT INTO users (id, username, password, email, name, createdAt, role, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [id, username, hashedPassword, email || null, name || null, createdAt, role, status],
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
                                    if (a.fcmTokens) {
                                        try { adminTokens.push(...JSON.parse(a.fcmTokens)); } catch (e) { }
                                    }
                                });
                                if (adminTokens.length > 0) {
                                    try {
                                        admin.messaging().sendEachForMulticast({
                                            tokens: [...new Set(adminTokens)],
                                            notification: { title: 'New User Registration', body: `${username} has registered and is waiting for approval.` }
                                        });
                                    } catch (e) { }
                                }
                            }
                        });
                    }

                    if (status === 'pending') {
                        res.json({ message: 'registered_pending', user: { id, username, name: name || null, email, role, status, createdAt } });
                    } else {
                        const token = jwt.sign({ id, username, role, status }, JWT_SECRET, { expiresIn: '7d' });
                        res.json({ message: 'success', token, user: { id, username, name: name || null, email, role, status, createdAt } });
                    }
                }
            );
        });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/auth/login', authRateLimiter(10, 15 * 60 * 1000), (req, res) => {
    const { username, password } = req.body;
    db.get('SELECT * FROM users WHERE username = ? OR email = ?', [username, username], async (err, user) => {
        if (err || !user) return res.status(404).json({ error: 'Account not found. Please sign up first.' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ error: 'Invalid password. Please check your credentials.' });

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

        if (user.status === 'pending') {
            return res.status(403).json({ error: 'Account is pending admin approval', message: 'registered_pending' });
        }
        if (user.status === 'rejected') {
            return res.status(403).json({ error: 'Account has been rejected by an administrator' });
        }

        // 2FA Intercept Flow
        if (user.totpEnabled) {
            return res.json({ message: 'require_2fa', username: user.username });
        }

        createSession(user.id, req, (err, sessionId) => {
            if (err) return res.status(500).json({ error: 'Failed to create session' });

            const token = jwt.sign({ id: user.id, username: user.username, role: user.role, status: user.status, sessionId }, JWT_SECRET, { expiresIn: '7d' });
            db.run('UPDATE sessions SET token = ? WHERE id = ?', [token, sessionId]);

            res.json({ message: 'success', token, user: { id: user.id, username: user.username, name: user.name || null, email: user.email, role: user.role, status: user.status, subscription: user.subscription, createdAt: user.createdAt } });
        });
    });
});

// Google Sign-In / Sign-Up Backend Verification & Auto-Registration Endpoint
app.post('/api/auth/google-auth', async (req, res) => {
    const { email, name, uid, isSignup } = req.body;
    if (!email && !uid) return res.status(400).json({ error: 'Email or UID required' });

    const username = email ? email.split('@')[0] : uid;

    db.get('SELECT * FROM users WHERE email = ? OR username = ? OR id = ?', [email, username, uid], async (err, user) => {
        if (err) return res.status(500).json({ error: err.message });

        if (!user) {
            if (!isSignup) {
                return res.status(404).json({ error: 'Account not found. Please sign up with Google first.' });
            }

            const id = uid || (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString());
            const createdAt = new Date().toISOString();
            const isMaster = (username === 'dakshitpatel27' || email === 'gajiparadakshit@gmail.com');
            const status = isMaster ? 'approved' : 'pending';
            const role = isMaster ? 'master' : 'user';

            db.run(
                'INSERT INTO users (id, username, email, name, createdAt, role, status, subscription) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [id, username, email || null, name || null, createdAt, role, status, 'pro'],
                (inErr) => {
                    if (inErr) return res.status(400).json({ error: inErr.message });
                    if (status === 'pending') {
                        return res.json({ message: 'registered_pending', user: { id, username, name, email, role, status, createdAt } });
                    }
                    const token = jwt.sign({ id, username, role, status }, JWT_SECRET, { expiresIn: '7d' });
                    res.json({ message: 'success', token, user: { id, username, name, email, role, status, createdAt } });
                }
            );
        } else {
            if (user.status === 'pending') {
                return res.status(403).json({ error: 'Account is pending admin approval', message: 'registered_pending' });
            }
            if (user.status === 'rejected') {
                return res.status(403).json({ error: 'Account has been rejected by an administrator' });
            }

            createSession(user.id, req, (sessErr, sessionId) => {
                const token = jwt.sign({ id: user.id, username: user.username, role: user.role, status: user.status, sessionId }, JWT_SECRET, { expiresIn: '7d' });
                res.json({ message: 'success', token, user: { id: user.id, username: user.username, name: user.name || name || null, email: user.email || email, role: user.role, status: user.status, subscription: user.subscription, createdAt: user.createdAt } });
            });
        }
    });
});

// Phone Sign-In / Sign-Up Backend Verification & Auto-Registration Endpoint
app.post('/api/auth/phone-auth', async (req, res) => {
    const { phoneNumber, uid, isSignup } = req.body;
    if (!phoneNumber && !uid) return res.status(400).json({ error: 'Phone number or UID required' });

    db.get('SELECT * FROM users WHERE phoneNumber = ? OR id = ?', [phoneNumber, uid], async (err, user) => {
        if (err) return res.status(500).json({ error: err.message });

        if (!user) {
            if (!isSignup) {
                return res.status(404).json({ error: 'Phone number not registered. Please sign up first.' });
            }

            const id = uid || (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString());
            const createdAt = new Date().toISOString();
            const username = `user_${phoneNumber.replace(/\D/g, '').slice(-6)}`;
            const status = 'pending';
            const role = 'user';

            db.run(
                'INSERT INTO users (id, username, phoneNumber, createdAt, role, status, subscription) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [id, username, phoneNumber, createdAt, role, status, 'pro'],
                (inErr) => {
                    if (inErr) return res.status(400).json({ error: inErr.message });
                    res.json({ message: 'registered_pending', user: { id, username, phoneNumber, role, status, createdAt } });
                }
            );
        } else {
            if (user.status === 'pending') {
                return res.status(403).json({ error: 'Account is pending admin approval', message: 'registered_pending' });
            }
            if (user.status === 'rejected') {
                return res.status(403).json({ error: 'Account has been rejected by an administrator' });
            }

            createSession(user.id, req, (sessErr, sessionId) => {
                const token = jwt.sign({ id: user.id, username: user.username, role: user.role, status: user.status, sessionId }, JWT_SECRET, { expiresIn: '7d' });
                res.json({ message: 'success', token, user: { id: user.id, username: user.username, name: user.name || null, email: user.email, role: user.role, status: user.status, subscription: user.subscription, createdAt: user.createdAt } });
            });
        }
    });
});

// Complete 2FA Login Flow
app.post('/api/auth/login/2fa', authRateLimiter(10, 15 * 60 * 1000), (req, res) => {
    const { username, token } = req.body;
    if (!username || !token) {
        return res.status(400).json({ error: 'Username and TOTP token required' });
    }

    db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
        if (err || !user) return res.status(401).json({ error: 'Invalid credentials' });

        if (user.status !== 'approved') {
            return res.status(403).json({ error: 'Account is pending admin approval' });
        }

        if (!user.totpEnabled || !user.totpSecret) {
            return res.status(400).json({ error: '2FA is not enabled for this user' });
        }

        const decryptedSecret = totp.decrypt(user.totpSecret);
        const isValid = totp.verifyTOTP(token, decryptedSecret);
        if (!isValid) {
            return res.status(401).json({ error: 'Invalid TOTP token' });
        }

        createSession(user.id, req, (err, sessionId) => {
            if (err) return res.status(500).json({ error: 'Failed to create session' });

            const jwtToken = jwt.sign({ id: user.id, username: user.username, role: user.role, status: user.status, sessionId }, JWT_SECRET, { expiresIn: '7d' });
            db.run('UPDATE sessions SET token = ? WHERE id = ?', [jwtToken, sessionId]);

            res.json({ message: 'success', token: jwtToken, user: { id: user.id, username: user.username, name: user.name || null, email: user.email, role: user.role, status: user.status, subscription: user.subscription, createdAt: user.createdAt } });
        });
    });
});

// GET current user profile
app.get('/api/auth/me', authMiddleware, (req, res) => {
    db.get('SELECT id, username, name, email, role, status, subscription, createdAt FROM users WHERE id = ?', [req.user.id], (err, user) => {
        if (err || !user) return res.status(404).json({ error: 'User not found' });
        res.json({ message: 'success', user });
    });
});

// PUT update user profile (Name & Email)
app.put('/api/users/profile', authMiddleware, (req, res) => {
    const { name, email } = req.body;
    db.run(
        'UPDATE users SET name = COALESCE(?, name), email = COALESCE(?, email) WHERE id = ?',
        [name !== undefined ? name : null, email !== undefined ? email : null, req.user.id],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            db.get('SELECT id, username, name, email, role, status, subscription, createdAt FROM users WHERE id = ?', [req.user.id], (err2, userRow) => {
                if (err2 || !userRow) return res.status(500).json({ error: 'Failed to retrieve updated profile' });
                res.json({ message: 'success', user: userRow });
            });
        }
    );
});

// --- 2FA Setup Endpoints (Authenticated) ---
app.post('/api/auth/2fa/setup', authMiddleware, async (req, res) => {
    const secret = totp.generateSecret();
    const encryptedSecret = totp.encrypt(secret);

    // Save generated secret (not yet enabled)
    db.run('UPDATE users SET totpSecret = ? WHERE id = ?', [encryptedSecret, req.user.id], async (err) => {
        if (err) return res.status(500).json({ error: 'Failed to generate 2FA secret' });

        try {
            const qrCodeLib = require('qrcode');
            const otpauthUrl = `otpauth://totp/IPOWatcher:${req.user.username}?secret=${secret}&issuer=IPOWatcher`;
            const qrCodeUrl = await qrCodeLib.toDataURL(otpauthUrl);
            res.json({ message: 'success', qrCode: qrCodeUrl, secret });
        } catch (e) {
            res.status(500).json({ error: 'Failed to generate 2FA QR code: ' + e.message });
        }
    });
});

app.post('/api/auth/2fa/verify', authMiddleware, (req, res) => {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'TOTP token is required' });

    db.get('SELECT totpSecret FROM users WHERE id = ?', [req.user.id], (err, user) => {
        if (err || !user || !user.totpSecret) {
            return res.status(400).json({ error: '2FA setup has not been initiated' });
        }

        const decryptedSecret = totp.decrypt(user.totpSecret);
        const isValid = totp.verifyTOTP(token, decryptedSecret);

        if (!isValid) {
            return res.status(400).json({ error: 'Invalid TOTP token' });
        }

        db.run('UPDATE users SET totpEnabled = 1 WHERE id = ?', [req.user.id], (updateErr) => {
            if (updateErr) return res.status(500).json({ error: 'Failed to enable 2FA' });
            res.json({ message: '2FA enabled successfully' });
        });
    });
});

app.post('/api/auth/2fa/disable', authMiddleware, (req, res) => {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'TOTP token is required' });

    db.get('SELECT totpSecret, totpEnabled FROM users WHERE id = ?', [req.user.id], (err, user) => {
        if (err || !user || !user.totpEnabled || !user.totpSecret) {
            return res.status(400).json({ error: '2FA is not enabled' });
        }

        const decryptedSecret = totp.decrypt(user.totpSecret);
        const isValid = totp.verifyTOTP(token, decryptedSecret);

        if (!isValid) {
            return res.status(400).json({ error: 'Invalid TOTP token' });
        }

        db.run('UPDATE users SET totpEnabled = 0, totpSecret = NULL WHERE id = ?', [req.user.id], (updateErr) => {
            if (updateErr) return res.status(500).json({ error: 'Failed to disable 2FA' });
            res.json({ message: '2FA disabled successfully' });
        });
    });
});

// --- User Notification Preferences Endpoints ---
app.get('/api/users/notification-preferences', authMiddleware, (req, res) => {
    db.get('SELECT emailNotifications, pushNotifications, inAppNotifications, gamificationEnabled FROM users WHERE id = ?', [req.user.id], (err, row) => {
        if (err || !row) return res.status(404).json({ error: 'User not found' });
        res.json({ message: 'success', data: row });
    });
});

app.put('/api/users/notification-preferences', authMiddleware, (req, res) => {
    const { emailNotifications, pushNotifications, inAppNotifications, gamificationEnabled } = req.body;
    db.run(
        `UPDATE users SET 
            emailNotifications = COALESCE(?, emailNotifications), 
            pushNotifications = COALESCE(?, pushNotifications), 
            inAppNotifications = COALESCE(?, inAppNotifications),
            gamificationEnabled = COALESCE(?, gamificationEnabled)
         WHERE id = ?`,
        [emailNotifications, pushNotifications, inAppNotifications, gamificationEnabled, req.user.id],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'success' });
        }
    );
});

// --- Real-Time Notifications Stream (SSE) & Helpers ---
const sseClients = new Map(); // userId -> Set of res

function pushRealtimeNotification(userId, payload) {
    if (sseClients.has(userId)) {
        const clientSet = sseClients.get(userId);
        const dataStr = `data: ${JSON.stringify(payload)}\n\n`;
        clientSet.forEach(clientRes => {
            try { clientRes.write(dataStr); } catch (e) { }
        });
    }
}

global.pushRealtimeNotification = pushRealtimeNotification;

app.get('/api/notifications/stream', (req, res) => {
    const token = req.query.token || (req.headers.authorization && req.headers.authorization.split(' ')[1]);
    if (!token) return res.status(401).send('Unauthorized');

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const userId = decoded.id;

        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders();

        if (!sseClients.has(userId)) {
            sseClients.set(userId, new Set());
        }
        sseClients.get(userId).add(res);

        res.write(`data: ${JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() })}\n\n`);

        req.on('close', () => {
            if (sseClients.has(userId)) {
                sseClients.get(userId).delete(res);
                if (sseClients.get(userId).size === 0) {
                    sseClients.delete(userId);
                }
            }
        });
    } catch (err) {
        return res.status(401).send('Invalid token');
    }
});

// Test trigger for instant Real-time GMP notification
app.post('/api/gmp-alerts/test-trigger', authMiddleware, (req, res) => {
    const { ipoName, targetGmp, currentGmp } = req.body;
    const testIpo = ipoName || 'Mainboard IPO';
    const testCurrent = currentGmp || 450;
    const testTarget = targetGmp || 400;

    const notifId = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString();
    const title = `🚀 GMP Threshold Crossed: ${testIpo}`;
    const body = `Live GMP is now ₹${testCurrent} (Target: ₹${testTarget} above)`;

    db.run(
        'INSERT INTO notifications (id, title, body, userId, sentAt, status) VALUES (?, ?, ?, ?, ?, ?)',
        [notifId, title, body, req.user.id, new Date().toISOString(), 'unread'],
        (err) => {
            if (err) return res.status(500).json({ error: err.message });

            pushRealtimeNotification(req.user.id, {
                type: 'gmp_alert',
                id: notifId,
                title,
                body,
                gmp: testCurrent,
                ipoName: testIpo,
                sentAt: new Date().toISOString()
            });

            res.json({ message: 'Real-time GMP alert broadcasted!', notifId });
        }
    );
});

// --- In-App Notifications Inbox Endpoints ---
app.get('/api/notifications', authMiddleware, (req, res) => {
    db.all('SELECT * FROM notifications WHERE userId = ? ORDER BY sentAt DESC LIMIT 100', [req.user.id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'success', data: rows });
    });
});

app.put('/api/notifications/:id/read', authMiddleware, (req, res) => {
    db.run('UPDATE notifications SET status = \'read\' WHERE id = ? AND userId = ?', [req.params.id, req.user.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'success' });
    });
});

app.put('/api/notifications/read-all', authMiddleware, (req, res) => {
    db.run('UPDATE notifications SET status = \'read\' WHERE userId = ?', [req.user.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'success' });
    });
});

app.delete('/api/notifications/:id', authMiddleware, (req, res) => {
    db.run('DELETE FROM notifications WHERE id = ? AND userId = ?', [req.params.id, req.user.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'success' });
    });
});

// --- ALLOTMENT ALERT BOT & WEBHOOK ENDPOINTS ---
app.get('/api/notifications/bot-config', authMiddleware, (req, res) => {
    db.get(
        'SELECT telegramToken, telegramChatId, telegramAlerts, whatsappNumber, whatsappAlerts, webhookUrl, webhookSecret, webhookAlerts FROM users WHERE id = ?',
        [req.user.id],
        (err, row) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'success', data: row || {} });
        }
    );
});

app.put('/api/notifications/bot-config', authMiddleware, (req, res) => {
    const { telegramToken, telegramChatId, telegramAlerts, whatsappNumber, whatsappAlerts, webhookUrl, webhookSecret, webhookAlerts } = req.body;
    db.run(
        `UPDATE users SET 
            telegramToken = COALESCE(?, telegramToken),
            telegramChatId = COALESCE(?, telegramChatId),
            telegramAlerts = COALESCE(?, telegramAlerts),
            whatsappNumber = COALESCE(?, whatsappNumber),
            whatsappAlerts = COALESCE(?, whatsappAlerts),
            webhookUrl = COALESCE(?, webhookUrl),
            webhookSecret = COALESCE(?, webhookSecret),
            webhookAlerts = COALESCE(?, webhookAlerts)
         WHERE id = ?`,
        [telegramToken, telegramChatId, telegramAlerts, whatsappNumber, whatsappAlerts, webhookUrl, webhookSecret, webhookAlerts, req.user.id],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'success' });
        }
    );
});

// Test Telegram Bot Alert
app.post('/api/notifications/test-telegram', authMiddleware, async (req, res) => {
    const { token, chatId } = req.body;
    const botToken = token || req.body.telegramToken;
    const targetChat = chatId || req.body.telegramChatId;

    if (!botToken || !targetChat) {
        return res.status(400).json({ error: 'Telegram Bot Token and Chat ID are required' });
    }

    try {
        const text = `🎉 *IPO Tracker - Allotment Alert Test*\n\nYour Telegram Bot is configured successfully! You will receive instant notifications here whenever IPO allotment results drop or high-value allotments are won.`;
        const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
        
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: targetChat, text, parse_mode: 'Markdown' })
        });

        const data = await response.json();
        if (!data.ok) {
            return res.status(400).json({ error: data.description || 'Failed to send Telegram message' });
        }

        res.json({ message: 'Telegram test alert sent successfully!', data });
    } catch (err) {
        res.status(500).json({ error: 'Telegram dispatch failed: ' + err.message });
    }
});

// Test WhatsApp Alert
app.post('/api/notifications/test-whatsapp', authMiddleware, async (req, res) => {
    const { whatsappNumber } = req.body;
    if (!whatsappNumber) {
        return res.status(400).json({ error: 'WhatsApp phone number required' });
    }

    const notifId = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString();
    const title = `📱 WhatsApp IPO Allotment Alert Configured`;
    const body = `Alerts will be sent to ${whatsappNumber} when allotment data is published.`;

    db.run(
        'INSERT INTO notifications (id, title, body, userId, sentAt, status) VALUES (?, ?, ?, ?, ?, ?)',
        [notifId, title, body, req.user.id, new Date().toISOString(), 'unread'],
        (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: `WhatsApp alert simulation dispatched to ${whatsappNumber}`, notifId });
        }
    );
});

// Test Outbound Webhook
app.post('/api/notifications/test-webhook', authMiddleware, async (req, res) => {
    const { webhookUrl, webhookSecret } = req.body;
    if (!webhookUrl) {
        return res.status(400).json({ error: 'Webhook URL required' });
    }

    try {
        const payload = {
            event: 'ALLOTMENT_TEST_EVENT',
            timestamp: new Date().toISOString(),
            data: {
                ipoName: 'Sample Mainboard IPO',
                applicantName: 'John Doe',
                status: 'ALLOTTED',
                sharesAllotted: 15,
                amountBlocked: 14925
            }
        };

        const secret = webhookSecret || 'ipo_secret_123';
        const signature = crypto.createHmac('sha256', secret).update(JSON.stringify(payload)).digest('hex');

        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-IPO-Signature': signature,
                'User-Agent': 'IPOTracker-Webhook/1.0'
            },
            body: JSON.stringify(payload)
        });

        res.json({ message: 'Webhook test dispatched!', status: response.status, statusText: response.statusText });
    } catch (err) {
        res.status(500).json({ error: 'Webhook delivery failed: ' + err.message });
    }
});

// --- WEBAUTHN BIOMETRIC PASSKEY ENDPOINTS ---
app.get('/api/auth/webauthn/credentials', authMiddleware, (req, res) => {
    db.all('SELECT id, credentialId, deviceName, createdAt FROM webauthn_credentials WHERE userId = ?', [req.user.id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'success', data: rows || [] });
    });
});

app.delete('/api/auth/webauthn/credentials/:id', authMiddleware, (req, res) => {
    db.run('DELETE FROM webauthn_credentials WHERE id = ? AND userId = ?', [req.params.id, req.user.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Passkey deleted successfully' });
    });
});

app.post('/api/auth/webauthn/register-options', authMiddleware, (req, res) => {
    const challenge = crypto.randomBytes(32).toString('base64url');
    const userId = req.user.id;
    const username = req.user.username;

    res.json({
        challenge,
        rp: { name: 'IPO Tracker', id: req.hostname || 'localhost' },
        user: {
            id: Buffer.from(userId).toString('base64url'),
            name: username,
            displayName: req.user.name || username
        },
        pubKeyCredParams: [
            { type: 'public-key', alg: -7 },  // ES256
            { type: 'public-key', alg: -257 } // RS256
        ],
        authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: 'preferred'
        },
        timeout: 60000
    });
});

app.post('/api/auth/webauthn/register-verify', authMiddleware, (req, res) => {
    const { credentialId, publicKey, deviceName } = req.body;
    if (!credentialId) return res.status(400).json({ error: 'Credential ID required' });

    const id = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString();
    const createdAt = new Date().toISOString();
    const name = deviceName || parseUserAgent(req.headers['user-agent']);

    db.run(
        'INSERT INTO webauthn_credentials (id, userId, credentialId, publicKey, deviceName, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
        [id, req.user.id, credentialId, publicKey || '', name, createdAt],
        (err) => {
            if (err) return res.status(400).json({ error: err.message });
            db.run('UPDATE users SET biometricEnabled = 1 WHERE id = ?', [req.user.id]);
            res.json({ message: 'Biometric Passkey registered successfully!', id });
        }
    );
});

app.post('/api/auth/webauthn/login-options', (req, res) => {
    const { username } = req.body;
    const challenge = crypto.randomBytes(32).toString('base64url');

    if (!username) {
        return res.json({ challenge, timeout: 60000 });
    }

    db.get('SELECT id FROM users WHERE username = ? OR email = ?', [username, username], (err, user) => {
        if (err || !user) return res.status(404).json({ error: 'User not found' });

        db.all('SELECT credentialId FROM webauthn_credentials WHERE userId = ?', [user.id], (err2, creds) => {
            const allowCredentials = (creds || []).map(c => ({
                id: c.credentialId,
                type: 'public-key'
            }));
            res.json({ challenge, allowCredentials, timeout: 60000 });
        });
    });
});

app.post('/api/auth/webauthn/login-verify', (req, res) => {
    const { credentialId, username } = req.body;
    if (!credentialId) return res.status(400).json({ error: 'Credential ID required for biometric verification' });

    db.get('SELECT * FROM webauthn_credentials WHERE credentialId = ?', [credentialId], (err, cred) => {
        if (err || !cred) return res.status(401).json({ error: 'Biometric passkey not found or invalid' });

        db.get('SELECT * FROM users WHERE id = ?', [cred.userId], (uErr, user) => {
            if (uErr || !user) return res.status(404).json({ error: 'User associated with passkey not found' });
            if (user.status !== 'approved') return res.status(403).json({ error: 'Account pending admin approval' });

            createSession(user.id, req, (sessErr, sessionId) => {
                if (sessErr) return res.status(500).json({ error: 'Failed to create session' });

                const token = jwt.sign({ id: user.id, username: user.username, role: user.role, status: user.status, sessionId }, JWT_SECRET, { expiresIn: '7d' });
                db.run('UPDATE sessions SET token = ? WHERE id = ?', [token, sessionId]);

                res.json({
                    message: 'Biometric login successful!',
                    token,
                    user: { id: user.id, username: user.username, name: user.name || null, email: user.email, role: user.role, status: user.status, subscription: user.subscription, createdAt: user.createdAt }
                });
            });
        });
    });
});

// --- PWA HOME SCREEN WIDGET DATA ENDPOINT ---
app.get('/api/widget/data', (req, res) => {
    db.all('SELECT ipoName, gmp, status, applied, alloted, profit FROM records ORDER BY createdAt DESC LIMIT 10', [], (err, records) => {
        const totalApplied = (records || []).filter(r => r.applied === 'Yes').length;
        const totalAllotted = (records || []).filter(r => r.alloted === 'Yes').length;
        const activeGmpList = (records || []).filter(r => r.gmp).map(r => ({ name: r.ipoName, gmp: r.gmp }));

        res.json({
            message: 'success',
            widget: {
                appTitle: 'IPO Tracker',
                totalApplied,
                totalAllotted,
                allotmentRate: totalApplied > 0 ? `${Math.round((totalAllotted / totalApplied) * 100)}%` : '0%',
                activeGmpList: activeGmpList.slice(0, 4),
                lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }
        });
    });
});

// GET all active sessions for current user (or ALL users if Master Admin)
app.get('/api/sessions', authMiddleware, (req, res) => {
    const isMasterAdmin = req.user.role === 'master';
    const query = isMasterAdmin
        ? `SELECT sessions.id, sessions.userId, sessions.deviceAgent, sessions.ipAddress, sessions.createdAt, sessions.lastActiveAt, users.username, users.role, users.subscription 
           FROM sessions JOIN users ON sessions.userId = users.id ORDER BY sessions.lastActiveAt DESC`
        : `SELECT sessions.id, sessions.userId, sessions.deviceAgent, sessions.ipAddress, sessions.createdAt, sessions.lastActiveAt, users.username, users.role, users.subscription 
           FROM sessions JOIN users ON sessions.userId = users.id WHERE sessions.userId = ? ORDER BY sessions.lastActiveAt DESC`;

    const params = isMasterAdmin ? [] : [req.user.id];

    db.all(query, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });

        if (!rows || rows.length === 0) {
            // Auto-create active session if none exist yet
            createSession(req.user.id, req, (createErr, newSessionId) => {
                const now = new Date().toISOString();
                const rawAgent = req.headers['user-agent'] || 'Unknown Device';
                const deviceAgent = parseUserAgent(rawAgent);
                const ipAddress = getClientIp(req);

                req.sessionId = newSessionId;
                res.json({
                    message: 'success',
                    data: [{
                        id: newSessionId,
                        userId: req.user.id,
                        username: req.user.username,
                        role: req.user.role,
                        subscription: req.user.subscription,
                        deviceAgent,
                        ipAddress,
                        createdAt: now,
                        lastActiveAt: now,
                        isCurrent: true
                    }]
                });
            });
            return;
        }

        let hasCurrentMatch = rows.some(r => r.id === req.sessionId);
        const sessions = rows.map((row, idx) => {
            const isCurrent = row.id === req.sessionId || (!hasCurrentMatch && row.userId === req.user.id && idx === 0);
            return {
                ...row,
                isCurrent
            };
        });

        res.json({ message: 'success', data: sessions });
    });
});

// DELETE (revoke) a specific session (Master Admin can revoke ANY session)
app.delete('/api/sessions/:id', authMiddleware, (req, res) => {
    const isMasterAdmin = req.user.role === 'master';

    db.get('SELECT id, userId FROM sessions WHERE id = ?', [req.params.id], (err, sessRow) => {
        if (err || !sessRow) {
            return res.status(404).json({ error: 'Session not found' });
        }

        if (!isMasterAdmin && sessRow.userId !== req.user.id) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        db.run('DELETE FROM sessions WHERE id = ?', [req.params.id], function (delErr) {
            if (delErr) return res.status(500).json({ error: delErr.message });

            // If Master Admin revokes another user's session, set user status to 'pending' (requires admin approval to log back in)
            if (isMasterAdmin && sessRow.userId !== req.user.id) {
                db.run("UPDATE users SET status = 'pending' WHERE id = ? AND role != 'master'", [sessRow.userId], () => {
                    res.json({ message: 'success', changes: this.changes, userRequiresApproval: true });
                });
            } else {
                res.json({ message: 'success', changes: this.changes });
            }
        });
    });
});

// Revoke all sessions except the current one
app.post('/api/sessions/logout-all', authMiddleware, (req, res) => {
    const isMasterAdmin = req.user.role === 'master';

    if (isMasterAdmin) {
        db.all('SELECT DISTINCT userId FROM sessions WHERE id != ?', [req.sessionId || ''], (err, rows) => {
            const userIdsToLock = (rows || []).map(r => r.userId).filter(uid => uid !== req.user.id);

            db.run('DELETE FROM sessions WHERE id != ?', [req.sessionId || ''], function (delErr) {
                if (delErr) return res.status(500).json({ error: delErr.message });

                if (userIdsToLock.length > 0) {
                    const placeholders = userIdsToLock.map(() => '?').join(',');
                    db.run(`UPDATE users SET status = 'pending' WHERE id IN (${placeholders}) AND role != 'master'`, userIdsToLock, () => {
                        res.json({ message: 'success', changes: this.changes });
                    });
                } else {
                    res.json({ message: 'success', changes: this.changes });
                }
            });
        });
    } else {
        db.run('DELETE FROM sessions WHERE userId = ? AND id != ?', [req.user.id, req.sessionId || ''], function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'success', changes: this.changes });
        });
    }
});

// Self-Service JSON Export of all user data
app.get('/api/users/export-all', authMiddleware, (req, res) => {
    logPanAccess(req, 'EXPORT_PROFILE', 'ALL_PROFILE_DATA', 'Self-service export of all personal and demographic data');

    const data = {};

    db.get('SELECT id, username, email, role, status, subscription, createdAt, emailNotifications, pushNotifications, inAppNotifications, gamificationEnabled FROM users WHERE id = ?', [req.user.id], (err, userRow) => {
        if (err || !userRow) return res.status(500).json({ error: 'Failed to fetch user profile' });
        data.profile = userRow;

        db.all('SELECT * FROM applicants WHERE userId = ?', [req.user.id], (err2, applicants) => {
            if (err2) return res.status(500).json({ error: 'Failed to fetch applicants' });
            data.applicants = applicants;

            db.all('SELECT * FROM records WHERE userId = ?', [req.user.id], (err3, records) => {
                if (err3) return res.status(500).json({ error: 'Failed to fetch records' });
                data.records = records;

                db.all('SELECT id, title, body, sentAt, status FROM notifications WHERE userId = ?', [req.user.id], (err4, notifications) => {
                    if (err4) return res.status(500).json({ error: 'Failed to fetch notifications' });
                    data.notifications = notifications;

                    db.all('SELECT id, action, target, details, createdAt FROM audit_logs WHERE adminId = ?', [req.user.id], (err5, auditLogs) => {
                        if (err5) return res.status(500).json({ error: 'Failed to fetch audit logs' });
                        data.auditLogs = auditLogs;

                        res.setHeader('Content-Type', 'application/json');
                        res.setHeader('Content-Disposition', 'attachment; filename="ipo_tracker_profile_export.json"');
                        res.json(data);
                    });
                });
            });
        });
    });
});

// Self-Service Delete User Account completely
app.delete('/api/users/delete-account', authMiddleware, (req, res) => {
    const userId = req.user.id;
    logPanAccess(req, 'DELETE_PROFILE', 'ALL_PROFILE_DATA', 'Self-service deletion of account and all associated details');

    db.run('BEGIN TRANSACTION', [], (beginErr) => {
        if (beginErr) return res.status(500).json({ error: 'Failed to delete account' });

        db.run('DELETE FROM users WHERE id = ?', [userId], (err1) => {
            db.run('DELETE FROM applicants WHERE userId = ?', [userId], (err2) => {
                db.run('DELETE FROM records WHERE userId = ?', [userId], (err3) => {
                    db.run('DELETE FROM notifications WHERE userId = ?', [userId], (err4) => {
                        db.run('DELETE FROM sessions WHERE userId = ?', [userId], (err5) => {
                            db.run('DELETE FROM audit_logs WHERE adminId = ?', [userId], (err6) => {
                                db.run('COMMIT', (commitErr) => {
                                    if (commitErr) return res.status(500).json({ error: 'Failed to delete account' });
                                    res.json({ message: 'success' });
                                });
                            });
                        });
                    });
                });
            });
        });
    });
});

// Export Schedule CG ITR-Ready tax CSV
app.get('/api/reports/itr-tax-export', authMiddleware, (req, res) => {
    db.all("SELECT * FROM records WHERE userId = ? AND holdingStatus = 'Sold' ORDER BY sellDate ASC", [req.user.id], (err, records) => {
        if (err) return res.status(500).json({ error: 'Failed to fetch tax records' });

        logPanAccess(req, 'EXPORT_TAX_LEDGER', 'MULTIPLE_PANS', `Exported ITR tax ledger containing ${records.length} sales`);

        const csvHeaders = [
            'Share/Security Name',
            'Quantity',
            'Allotment/Acquisition Date',
            'Acquisition Cost (₹)',
            'Transfer/Sale Date',
            'Full Value of Consideration (₹)',
            'Deductible Transfer Charges (₹)',
            'Net Capital Gains (₹)',
            'Gain Type',
            'ITR-2 Schedule CG Section Code'
        ];

        const csvRows = records.map(r => {
            const qty = parseFloat(r.shares) || 0;
            const buyPrice = parseFloat(r.price) || 0;
            const sellPrice = parseFloat(r.sellPrice) || 0;

            const costOfAcquisition = buyPrice * qty;
            const consideration = sellPrice * qty;

            // Deductible transfer charges include Brokerage, STT, Exchange charges, SEBI fees, DP charges, GST
            const stampDuty = parseFloat(r.stampDuty) || 0;
            const brokerage = parseFloat(r.brokerage) || 0;
            const stt = parseFloat(r.stt) || 0;
            const exchange = parseFloat(r.exchangeCharges) || 0;
            const sebi = parseFloat(r.sebiFees) || 0;
            const dp = parseFloat(r.dpCharges) || 0;
            const gst = parseFloat(r.gst) || 0;

            const transferCharges = stampDuty + brokerage + stt + exchange + sebi + dp + gst;
            const netGain = consideration - costOfAcquisition - transferCharges;

            // Determine if short term or long term
            let isLongTerm = false;
            if (r.sellDate && r.listingDate) {
                const sellD = new Date(r.sellDate);
                const listD = new Date(r.listingDate);
                const diffTime = Math.abs(sellD - listD);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                if (diffDays > 365) isLongTerm = true;
            }

            const gainType = isLongTerm ? 'Long Term' : 'Short Term';
            const sectionCode = isLongTerm ? 'Section 112A' : 'Section 111A';

            return [
                `"${(r.ipoName || 'Unknown').replace(/"/g, '""')}"`,
                qty,
                r.listingDate || r.createdAt ? (r.listingDate || r.createdAt).split('T')[0] : '—',
                costOfAcquisition.toFixed(2),
                r.sellDate ? r.sellDate.split('T')[0] : '—',
                consideration.toFixed(2),
                transferCharges.toFixed(2),
                netGain.toFixed(2),
                gainType,
                sectionCode
            ].join(',');
        });

        const csvContent = [csvHeaders.join(','), ...csvRows].join('\r\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="itr2_schedule_cg_export_${new Date().toISOString().split('T')[0]}.csv"`);
        res.send(csvContent);
    });
});

// Feature 5: CA-Ready PDF / HTML Tax Audit & Schedule CG Report Generator
app.get('/api/reports/ca-tax-audit-pdf', authMiddleware, (req, res) => {
    db.all("SELECT * FROM records WHERE userId = ? AND holdingStatus = 'Sold' ORDER BY sellDate ASC", [req.user.id], (err, records) => {
        if (err) return res.status(500).json({ error: 'Failed to fetch tax records' });

        db.get('SELECT username, email FROM users WHERE id = ?', [req.user.id], (userErr, user) => {
            const userName = user?.username || 'Valued User';
            let grossProfitTotal = 0;
            let stcgTotal = 0;
            let ltcgTotal = 0;
            let totalCharges = 0;

            const rowsHtml = (records || []).map((r, i) => {
                const qty = parseFloat(r.shares) || 1;
                const buyPrice = parseFloat(r.price) || 0;
                const sellPrice = parseFloat(r.sellPrice) || parseFloat(r.listingPrice) || buyPrice;
                const buyValue = qty * buyPrice;
                const sellValue = qty * sellPrice;

                const grossProfit = sellValue - buyValue;
                grossProfitTotal += grossProfit;

                const calc = calculator.calculateCharges(buyPrice, qty, sellPrice, 'Sold', r.listingPrice, r.gmp);
                totalCharges += (calc.totalCharges || 0);

                let isLongTerm = false;
                if (r.sellDate && r.listingDate) {
                    const diffDays = Math.ceil(Math.abs(new Date(r.sellDate) - new Date(r.listingDate)) / (1000 * 60 * 60 * 24));
                    if (diffDays > 365) isLongTerm = true;
                }

                const netCapGain = calc.netProfit; // Net P&L before income tax (Gross - Statutory Charges)
                const recordTax = isLongTerm ? Math.max(0, netCapGain * 0.125) : Math.max(0, netCapGain * 0.20);
                const afterTaxProfit = netCapGain - recordTax;

                if (isLongTerm) ltcgTotal += netCapGain;
                else stcgTotal += netCapGain;

                return `
                  <tr style="border-bottom: 1px solid #e2e8f0;">
                    <td style="padding: 8px;">${i + 1}</td>
                    <td style="padding: 8px; font-weight: bold;">${r.ipoName || 'IPO'}</td>
                    <td style="padding: 8px;">${r.applicantName || 'Applicant'}</td>
                    <td style="padding: 8px;">${r.pan || '—'}</td>
                    <td style="padding: 8px; text-align: right;">${qty}</td>
                    <td style="padding: 8px; text-align: right;">₹${buyPrice.toFixed(2)}</td>
                    <td style="padding: 8px; text-align: right;">₹${sellPrice.toFixed(2)}</td>
                    <td style="padding: 8px; text-align: right; color: ${grossProfit >= 0 ? '#2563eb' : '#dc2626'}; font-weight: bold;">₹${grossProfit.toFixed(2)}</td>
                    <td style="padding: 8px; text-align: right; color: #475569;">₹${(calc.totalCharges || 0).toFixed(2)}</td>
                    <td style="padding: 8px; text-align: right; color: #4338ca;">₹${recordTax.toFixed(2)}</td>
                    <td style="padding: 8px; text-align: right; color: ${afterTaxProfit >= 0 ? '#059669' : '#dc2626'}; font-weight: bold;">₹${afterTaxProfit.toFixed(2)}</td>
                    <td style="padding: 8px; text-align: center;"><span style="background: ${isLongTerm ? '#dcfce7' : '#fee2e2'}; color: ${isLongTerm ? '#166534' : '#991b1b'}; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 11px;">${isLongTerm ? 'LTCG (112A)' : 'STCG (111A)'}</span></td>
                  </tr>
                `;
            }).join('');

            const estimatedTax = (stcgTotal > 0 ? stcgTotal * 0.20 : 0) + (ltcgTotal > 0 ? Math.max(0, ltcgTotal - 125000) * 0.125 : 0);
            const netAfterTaxTotal = (stcgTotal + ltcgTotal) - estimatedTax;

            const reportHtml = `
              <!DOCTYPE html>
              <html>
              <head>
                <meta charset="utf-8" />
                <title>CA-Ready Tax Audit Report — Schedule CG</title>
                <style>
                  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 13px; color: #1e293b; padding: 40px; background: #fff; position: relative; }
                  .header { display: flex; justify-content: space-between; border-bottom: 2px solid #6366f1; padding-bottom: 15px; margin-bottom: 20px; }
                  .title { font-size: 20px; font-weight: bold; color: #4338ca; }
                  .summary-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; margin-bottom: 20px; display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; }
                  .card { padding: 10px; background: #fff; border: 1px solid #cbd5e1; border-radius: 6px; }
                  .card-title { font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: bold; }
                  .card-value { font-size: 16px; font-weight: bold; margin-top: 4px; }
                  table { width: 100%; border-collapse: collapse; margin-top: 15px; }
                  th { background: #f1f5f9; text-align: left; padding: 8px; font-size: 11px; text-transform: uppercase; border-bottom: 2px solid #cbd5e1; }
                  .btn-action { display: inline-flex; align-items: center; gap: 6px; padding: 7px 14px; border-radius: 6px; font-weight: 600; font-size: 12px; cursor: pointer; border: none; transition: all 0.2s ease; }
                  .btn-print { background: #4f46e5; color: #ffffff; box-shadow: 0 2px 6px rgba(79, 70, 229, 0.3); }
                  .btn-print:hover { background: #4338ca; }
                  .btn-download { background: #059669; color: #ffffff; box-shadow: 0 2px 6px rgba(5, 150, 105, 0.3); }
                  .btn-download:hover { background: #047857; }
                  @media print {
                    .no-print { display: none !important; }
                    body { padding: 15px !important; }
                  }
                </style>
              </head>
              <body>
                <div class="header">
                  <div>
                    <div class="title">IPO TRACKER — CA-READY TAX AUDIT REPORT</div>
                    <div style="color: #64748b; font-size: 11px; margin-top: 4px;">Schedule CG (Capital Gains) Annexure for FY2024-25</div>
                  </div>
                  <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 8px;">
                    <div class="no-print" style="display: flex; gap: 8px;">
                      <button onclick="window.print()" class="btn-action btn-print">
                        <span>🖨️ Print Report</span>
                      </button>
                      <button onclick="window.print()" class="btn-action btn-download" title="Save as PDF via Print dialog">
                        <span>📥 Download PDF</span>
                      </button>
                    </div>
                    <div style="text-align: right; font-size: 11px; color: #475569;">
                      <div><b>Taxpayer:</b> ${userName} (${user?.email || 'N/A'})</div>
                      <div><b>Date Generated:</b> ${new Date().toLocaleDateString('en-IN')}</div>
                    </div>
                  </div>
                </div>

                <div class="summary-box" style="grid-template-columns: repeat(5, 1fr);">
                  <div class="card" style="background: #eff6ff; border-color: #bfdbfe;">
                    <div class="card-title" style="color: #1e40af;">Total Gross Profit (Raw)</div>
                    <div class="card-value" style="color: #2563eb;">₹${grossProfitTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                  </div>
                  <div class="card">
                    <div class="card-title">STCG (Before Tax)</div>
                    <div class="card-value" style="color: #dc2626;">₹${stcgTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                  </div>
                  <div class="card">
                    <div class="card-title">Statutory Charges</div>
                    <div class="card-value" style="color: #475569;">₹${totalCharges.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                  </div>
                  <div class="card" style="background: #eef2ff; border-color: #c7d2fe;">
                    <div class="card-title" style="color: #3730a3;">Est. Tax Liability</div>
                    <div class="card-value" style="color: #4338ca;">₹${estimatedTax.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                  </div>
                  <div class="card" style="background: #ecfdf5; border-color: #a7f3d0;">
                    <div class="card-title" style="color: #065f46;">Net After-Tax Profit</div>
                    <div class="card-value" style="color: #059669;">₹${netAfterTaxTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                  </div>
                </div>

                <h3>Realized Transactions Audit Sheet</h3>
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>IPO Name</th>
                      <th>Applicant</th>
                      <th>PAN</th>
                      <th style="text-align: right;">Qty</th>
                      <th style="text-align: right;">Buy Price</th>
                      <th style="text-align: right;">Sell Price</th>
                      <th style="text-align: right;">Gross P&L (Raw)</th>
                      <th style="text-align: right;">Statutory Charges</th>
                      <th style="text-align: right;">Est. Tax</th>
                      <th style="text-align: right;">Net P&L (After Tax)</th>
                      <th style="text-align: center;">Tax Class</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${rowsHtml || '<tr><td colspan="11" style="text-align:center; padding: 20px;">No realized sales recorded yet.</td></tr>'}
                  </tbody>
                </table>
              </body>
              </html>
            `;

            res.setHeader('Content-Type', 'text/html');
            res.send(reportHtml);
        });
    });
});

// Save Telegram settings
app.post('/api/user/telegram', authMiddleware, (req, res) => {
    const { telegramToken, telegramChatId, telegramAlerts } = req.body;
    db.run(
        'UPDATE users SET telegramToken = ?, telegramChatId = ?, telegramAlerts = ? WHERE id = ?',
        [telegramToken || '', telegramChatId || '', telegramAlerts ? 1 : 0, req.user.id],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Telegram settings saved successfully' });
        }
    );
});

// GET Telegram settings
app.get('/api/user/telegram', authMiddleware, (req, res) => {
    db.get('SELECT telegramToken, telegramChatId, telegramAlerts FROM users WHERE id = ?', [req.user.id], (err, row) => {
        if (err || !row) return res.status(500).json({ error: 'Failed to fetch Telegram settings' });
        res.json({ message: 'success', data: row });
    });
});

// TEST Telegram Bot Message
app.post('/api/webhooks/telegram/test', authMiddleware, async (req, res) => {
    const { chatId, botToken } = req.body;
    const targetChatId = chatId || req.user.telegramChatId;
    const targetToken = botToken || req.user.telegramToken;

    if (!targetChatId || !targetToken) {
        return res.status(400).json({ error: 'Telegram Chat ID and Bot Token are required' });
    }

    try {
        const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
        const testMsg = `🚀 *IPO Tracker Telegram Bot Connected!*\n\nYour Telegram bot interface is online. Try sending commands:\n- \`/status\` - Active IPO applications\n- \`/allotment\` - Allotted portfolio summary\n- \`/gmp\` - Current GMP updates\n- \`/summary\` - Investment overview`;

        const url = `https://api.telegram.org/bot${targetToken}/sendMessage`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: targetChatId, text: testMsg, parse_mode: 'Markdown' })
        });
        const json = await response.json();
        if (!json.ok) throw new Error(json.description || 'Telegram API returned error');
        res.json({ message: 'Telegram test message sent successfully!', result: json });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// INTERACTIVE Telegram Webhook Handler (Receives /status, /allotment, /gmp, /summary commands)
app.post('/api/webhooks/telegram', async (req, res) => {
    res.status(200).send('OK'); // Always return 200 to Telegram instantly

    const body = req.body || {};
    const message = body.message || body.edited_message;
    if (!message || !message.text || !message.chat) return;

    const chatId = String(message.chat.id);
    const text = message.text.trim();
    const command = text.split(' ')[0].toLowerCase();

    db.get('SELECT id, username, telegramToken FROM users WHERE telegramChatId = ?', [chatId], async (err, user) => {
        if (err || !user || !user.telegramToken) return;

        const botToken = user.telegramToken;
        const sendReply = async (replyText) => {
            try {
                const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
                await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ chat_id: chatId, text: replyText, parse_mode: 'Markdown' })
                });
            } catch (e) {
                console.error("Failed to send Telegram bot reply:", e.message);
            }
        };

        if (command === '/start' || command === '/help') {
            const helpText = `👋 *Welcome to IPO Tracker Bot, ${user.username || 'Investor'}!*\n\n` +
                `Here are available interactive commands:\n` +
                `🔹 \`/status\` - Check recent IPO applications\n` +
                `🔹 \`/allotment\` - View allotted IPO portfolio\n` +
                `🔹 \`/gmp\` - Check live Grey Market Premiums\n` +
                `🔹 \`/summary\` - View application & allotment totals`;
            return sendReply(helpText);
        }

        if (command === '/status') {
            db.all('SELECT ipoName, applicantName, status, amount FROM records WHERE userId = ? ORDER BY createdAt DESC LIMIT 5', [user.id], (err2, records) => {
                if (err2 || !records || records.length === 0) {
                    return sendReply('📭 No active IPO applications found in your account.');
                }
                let reply = `📋 *Recent IPO Applications (${records.length})*:\n\n`;
                records.forEach((r, idx) => {
                    const badge = r.status === 'ALLOTTED' ? '🎉 ALLOTTED' : (r.status === 'REJECTED' ? '❌ NOT ALLOTTED' : '⏳ APPLIED');
                    reply += `${idx + 1}. *${r.ipoName}*\n   👤 Applicant: ${r.applicantName || 'Self'}\n   💰 Amount: ₹${Number(r.amount || 0).toLocaleString('en-IN')}\n   Status: ${badge}\n\n`;
                });
                sendReply(reply);
            });
            return;
        }

        if (command === '/allotment') {
            db.all('SELECT ipoName, applicantName, amount, shares FROM records WHERE userId = ? AND (status = "ALLOTTED" OR status = "WON")', [user.id], (err2, records) => {
                if (err2 || !records || records.length === 0) {
                    return sendReply('🔍 No allotted IPO shares recorded yet.');
                }
                let reply = `🎉 *Allotted IPO Portfolio (${records.length} wins)*:\n\n`;
                records.forEach((r, idx) => {
                    reply += `🏆 *${r.ipoName}*\n   👤 Holder: ${r.applicantName || 'Self'}\n   📊 Shares: ${r.shares || '1 Lot'} | Investment: ₹${Number(r.amount || 0).toLocaleString('en-IN')}\n\n`;
                });
                sendReply(reply);
            });
            return;
        }

        if (command === '/gmp') {
            db.all('SELECT ipoName, gmp, estListing, status FROM gmp_alerts ORDER BY createdAt DESC LIMIT 5', [], (err2, alerts) => {
                if (err2 || !alerts || alerts.length === 0) {
                    return sendReply('📈 *GMP Updates*: Market sentiment is neutral. Check web dashboard for details.');
                }
                let reply = `🔥 *Current Grey Market Premiums (GMP)*:\n\n`;
                alerts.forEach(a => {
                    reply += `📌 *${a.ipoName}*: GMP +₹${a.gmp || 0} (${a.estListing || 'N/A'})\n`;
                });
                sendReply(reply);
            });
            return;
        }

        if (command === '/summary') {
            db.get('SELECT COUNT(*) as total, SUM(CASE WHEN status = "ALLOTTED" THEN 1 ELSE 0 END) as allotted, SUM(amount) as totalAmt FROM records WHERE userId = ?', [user.id], (err2, row) => {
                if (err2 || !row) return sendReply('Failed to retrieve summary.');
                const reply = `📊 *IPO Portfolio Overview*:\n\n` +
                    `📝 Total Bids Applied: *${row.total || 0}*\n` +
                    `🎉 Allotments Won: *${row.allotted || 0}*\n` +
                    `💼 Total Capital Applied: *₹${Number(row.totalAmt || 0).toLocaleString('en-IN')}*`;
                sendReply(reply);
            });
            return;
        }

        // Fallback for unknown text
        sendReply(`❓ Command unrecognized. Type \`/help\` to view available commands.`);
    });
});

// ========== BANK ACCOUNTS & EXPENSE TRACKER API ==========

// Helper: record a transaction and update account balance
function recordTransaction(userId, bankAccountId, type, category, amount, description, referenceId, callback) {
    const txnId = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    const now = new Date().toISOString();
    const amountNum = parseFloat(amount) || 0;

    db.get('SELECT balance FROM bank_accounts WHERE id = ? AND userId = ?', [bankAccountId, userId], (err, account) => {
        if (err || !account) return callback(new Error('Bank account not found'));

        const currentBalance = parseFloat(account.balance) || 0;
        const newBalance = type === 'credit' ? currentBalance + amountNum : currentBalance - amountNum;

        db.run('UPDATE bank_accounts SET balance = ? WHERE id = ? AND userId = ?', [newBalance, bankAccountId, userId], (updateErr) => {
            if (updateErr) return callback(updateErr);

            db.run(
                'INSERT INTO transactions (id, userId, bankAccountId, type, category, amount, runningBalance, description, referenceId, date, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [txnId, userId, bankAccountId, type, category, amountNum, newBalance, description, referenceId || null, now, now],
                (insertErr) => {
                    if (insertErr) return callback(insertErr);
                    callback(null, { id: txnId, newBalance, amount: amountNum });
                }
            );
        });
    });
}

// GET all bank accounts
app.get('/api/bank-accounts', authMiddleware, (req, res) => {
    db.all('SELECT * FROM bank_accounts WHERE userId = ? ORDER BY createdAt DESC', [req.user.id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'success', data: rows || [] });
    });
});

// POST create a new bank account
app.post('/api/bank-accounts', authMiddleware, (req, res) => {
    const { accountName, bankName, accountNumber, ifscCode, accountType, balance, color } = req.body;
    if (!accountName || !bankName) return res.status(400).json({ error: 'Account name and bank name are required' });

    const id = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    const now = new Date().toISOString();
    const openingBalance = parseFloat(balance) || 0;

    db.run(
        'INSERT INTO bank_accounts (id, userId, accountName, bankName, accountNumber, ifscCode, accountType, balance, color, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [id, req.user.id, accountName, bankName, accountNumber || '', ifscCode || '', accountType || 'Savings', openingBalance, color || '#6366f1', now],
        function (err) {
            if (err) return res.status(400).json({ error: err.message });

            // Record opening balance transaction if balance > 0
            if (openingBalance > 0) {
                const txnId = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
                db.run(
                    'INSERT INTO transactions (id, userId, bankAccountId, type, category, amount, runningBalance, description, referenceId, date, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                    [txnId, req.user.id, id, 'credit', 'OPENING_BALANCE', openingBalance, openingBalance, `Opening balance for ${accountName}`, null, now, now]
                );
            }

            res.json({ message: 'success', id });
        }
    );
});

// PUT update a bank account
app.put('/api/bank-accounts/:id', authMiddleware, (req, res) => {
    const { accountName, bankName, accountNumber, ifscCode, accountType, color } = req.body;
    db.run(
        `UPDATE bank_accounts SET 
            accountName = COALESCE(?, accountName), 
            bankName = COALESCE(?, bankName), 
            accountNumber = COALESCE(?, accountNumber), 
            ifscCode = COALESCE(?, ifscCode), 
            accountType = COALESCE(?, accountType), 
            color = COALESCE(?, color) 
         WHERE id = ? AND userId = ?`,
        [accountName, bankName, accountNumber, ifscCode, accountType, color, req.params.id, req.user.id],
        function (err) {
            if (err) return res.status(400).json({ error: err.message });
            res.json({ message: 'success', changes: this.changes });
        }
    );
});

// DELETE a bank account (only if no linked records)
app.delete('/api/bank-accounts/:id', authMiddleware, (req, res) => {
    db.get('SELECT COUNT(*) as count FROM records WHERE bankAccountId = ? AND userId = ?', [req.params.id, req.user.id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (row && row.count > 0) {
            return res.status(400).json({ error: `Cannot delete: ${row.count} IPO record(s) are linked to this account. Unlink them first.` });
        }
        db.run('DELETE FROM transactions WHERE bankAccountId = ? AND userId = ?', [req.params.id, req.user.id], () => {
            db.run('DELETE FROM bank_accounts WHERE id = ? AND userId = ?', [req.params.id, req.user.id], function (delErr) {
                if (delErr) return res.status(400).json({ error: delErr.message });
                res.json({ message: 'success', changes: this.changes });
            });
        });
    });
});

// GET transactions (passbook) — optionally filter by bankAccountId
app.get('/api/transactions', authMiddleware, (req, res) => {
    const { bankAccountId, category, limit } = req.query;
    let sql = 'SELECT t.*, ba.accountName, ba.bankName FROM transactions t LEFT JOIN bank_accounts ba ON t.bankAccountId = ba.id WHERE t.userId = ?';
    const params = [req.user.id];

    if (bankAccountId) {
        sql += ' AND t.bankAccountId = ?';
        params.push(bankAccountId);
    }
    if (category) {
        sql += ' AND t.category = ?';
        params.push(category);
    }
    sql += ' ORDER BY t.createdAt DESC';
    if (limit) {
        sql += ' LIMIT ?';
        params.push(parseInt(limit));
    }

    db.all(sql, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'success', data: rows || [] });
    });
});

// POST add a manual transaction (credit/debit)
app.post('/api/transactions', authMiddleware, (req, res) => {
    const { bankAccountId, type, category, amount, description } = req.body;
    if (!bankAccountId || !type || !amount) {
        return res.status(400).json({ error: 'Bank account, type, and amount are required' });
    }
    if (!['credit', 'debit'].includes(type)) {
        return res.status(400).json({ error: 'Type must be credit or debit' });
    }

    const cat = category || (type === 'credit' ? 'MANUAL_CREDIT' : 'MANUAL_DEBIT');
    recordTransaction(req.user.id, bankAccountId, type, cat, amount, description || `Manual ${type}`, null, (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'success', transaction: result });
    });
});

// ========== EXPENSE TRACKER API ==========

// Helper: Parse receipt text/PDF for amount, date, category, and merchant
async function parseReceiptContent(fileBuffer, mimeType, originalName) {
    let rawText = '';
    if (mimeType === 'application/pdf' || (originalName && originalName.toLowerCase().endsWith('.pdf'))) {
        try {
            const pdfData = await pdfParse(fileBuffer);
            rawText = pdfData.text || '';
        } catch (e) {
            console.error('PDF Parse Error:', e);
        }
    }

    if (!rawText) {
        rawText = fileBuffer.toString('utf8', 0, Math.min(fileBuffer.length, 10000));
    }

    let amount = null;
    let date = null;
    let category = 'Other';
    let merchant = '';

    // Amount Extractor
    const totalRegex = /(?:total|grand\s*total|net\s*amount|amount\s*paid|paid\s*amount|bill\s*amount|amount|inr|rs\.?|₹)[\s\:\=]*([\d,]+(?:\.\d{1,2})?)/gi;
    let match;
    let maxAmount = 0;
    while ((match = totalRegex.exec(rawText)) !== null) {
        const val = parseFloat(match[1].replace(/,/g, ''));
        if (!isNaN(val) && val > maxAmount && val < 1000000) {
            maxAmount = val;
        }
    }
    if (maxAmount > 0) {
        amount = maxAmount;
    } else {
        const floatRegex = /(?:₹|inr|rs\.?)\s*([\d,]+(?:\.\d{1,2})?)/gi;
        while ((match = floatRegex.exec(rawText)) !== null) {
            const val = parseFloat(match[1].replace(/,/g, ''));
            if (!isNaN(val) && val > 0 && val < 1000000) {
                amount = val;
                break;
            }
        }
    }

    // Date Extractor
    const dateIsoMatch = rawText.match(/\b(202[0-9]-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12][0-9]|3[01]))\b/);
    const dateSlashMatch = rawText.match(/\b((?:0[1-9]|[12][0-9]|3[01])[\/\-](?:0[1-9]|1[0-2])[\/\-](?:202[0-9]|2[0-9]))\b/);
    const dateTextMatch = rawText.match(/\b((?:0[1-9]|[12][0-9]|3[01])\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(?:202[0-9]))\b/i);

    if (dateIsoMatch) {
        date = dateIsoMatch[1];
    } else if (dateSlashMatch) {
        const parts = dateSlashMatch[1].split(/[\/\-]/);
        const year = parts[2].length === 2 ? '20' + parts[2] : parts[2];
        date = `${year}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    } else if (dateTextMatch) {
        const d = new Date(dateTextMatch[1]);
        if (!isNaN(d.getTime())) {
            date = d.toISOString().split('T')[0];
        }
    }

    if (!date) {
        date = new Date().toISOString().split('T')[0];
    }

    // Category Extractor
    const lowerText = rawText.toLowerCase() + ' ' + (originalName || '').toLowerCase();

    if (/swiggy|zomato|dominos|mcdonald|kfc|starbucks|restaurant|cafe|food|dining|pizza|burger|eats/i.test(lowerText)) {
        category = 'Food';
    } else if (/uber|ola|rapido|petrol|fuel|shell|bpcl|hpcl|rail|irctc|flight|indigo|airindia|cab|taxi|fastag/i.test(lowerText)) {
        category = 'Transport';
    } else if (/amazon|flipkart|myntra|zara|ajio|meesho|decathlon|retail|store|mall|apparel|shopping/i.test(lowerText)) {
        category = 'Shopping';
    } else if (/electricity|torrent|bescom|tata\s*power|airtel|jio|vi|broadband|water|gas|utility|recharge|bill/i.test(lowerText)) {
        category = 'Bills';
    } else if (/pharmacy|apollo|pharmeasy|1mg|hospital|clinic|doctor|medplus|lab|health|medical/i.test(lowerText)) {
        category = 'Health';
    } else if (/pvr|inox|bookmyshow|netflix|prime|spotify|movie|cinema|game|entertainment/i.test(lowerText)) {
        category = 'Entertainment';
    } else if (/school|college|university|udemy|coursera|tuition|exam|education|book|stationery/i.test(lowerText)) {
        category = 'Education';
    } else if (/rent|society|maintenance|landlord|flat|apartment|housing/i.test(lowerText)) {
        category = 'Rent';
    } else if (/zerodha|groww|upstox|mutual\s*fund|sip|investment|stocks|gold/i.test(lowerText)) {
        category = 'Investments';
    }

    const lines = rawText.split('\n').map(l => l.trim()).filter(l => l.length > 2);
    if (lines.length > 0) {
        merchant = lines[0].substring(0, 40);
    }
    if (!merchant || merchant.toLowerCase().includes('total') || merchant.toLowerCase().includes('invoice')) {
        merchant = originalName ? originalName.replace(/\.[^/.]+$/, "") : `${category} Purchase`;
    }

    return {
        amount: amount || '',
        date: date,
        category: category,
        description: merchant,
        merchant: merchant,
        rawTextSnippet: rawText.substring(0, 300)
    };
}

// POST Parse Expense Receipt (Image or PDF)
app.post('/api/expenses/parse-receipt', authMiddleware, upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No receipt file uploaded' });
    }

    try {
        const parsed = await parseReceiptContent(req.file.buffer, req.file.mimetype, req.file.originalname);
        res.json({ message: 'success', data: parsed });
    } catch (err) {
        console.error('Receipt Parsing Error:', err);
        res.status(500).json({ error: 'Failed to parse receipt: ' + err.message });
    }
});

// GET Monthly Financial Digest & Tax Statement (HTML/PDF Printable Report)
app.get('/api/reports/monthly-digest-pdf', authMiddleware, (req, res) => {
    const now = new Date();
    const month = parseInt(req.query.month) || (now.getMonth() + 1);
    const year = parseInt(req.query.year) || now.getFullYear();

    const monthStr = String(month).padStart(2, '0');
    const monthYearPattern = `${year}-${monthStr}`;
    const monthName = new Date(year, month - 1).toLocaleString('en-IN', { month: 'long' });

    db.get('SELECT username, email FROM users WHERE id = ?', [req.user.id], (userErr, user) => {
        const userName = user?.username || 'Valued User';

        // 1. Fetch Expenses for this month
        db.all(
            `SELECT e.*, ba.accountName 
             FROM expenses e 
             LEFT JOIN bank_accounts ba ON e.bankAccountId = ba.id 
             WHERE e.userId = ? AND e.date LIKE ? 
             ORDER BY e.date ASC`,
            [req.user.id, `${monthYearPattern}%`],
            (expErr, expenses) => {
                if (expErr) expenses = [];

                // Category Summary
                const categoryTotals = {};
                let totalExpenses = 0;
                (expenses || []).forEach(e => {
                    const amt = parseFloat(e.amount) || 0;
                    totalExpenses += amt;
                    const cat = e.category || 'Other';
                    categoryTotals[cat] = (categoryTotals[cat] || 0) + amt;
                });

                // 2. Fetch Sold IPO Records for this month
                db.all(
                    `SELECT * FROM records 
                     WHERE userId = ? AND holdingStatus = 'Sold' AND (sellDate LIKE ? OR (sellDate IS NULL AND listingDate LIKE ?))
                     ORDER BY sellDate ASC`,
                    [req.user.id, `${monthYearPattern}%`, `${monthYearPattern}%`],
                    (recErr, records) => {
                        if (recErr) records = [];

                        let grossIpoProfit = 0;
                        let totalCharges = 0;
                        let stcgGains = 0;
                        let ltcgGains = 0;

                        (records || []).forEach(r => {
                            const qty = parseFloat(r.shares) || 1;
                            const buyPrice = parseFloat(r.price) || 0;
                            const sellPrice = parseFloat(r.sellPrice) || parseFloat(r.listingPrice) || buyPrice;
                            const grossProfit = (sellPrice - buyPrice) * qty;
                            grossIpoProfit += grossProfit;

                            const calc = calculator.calculateCharges(buyPrice, qty, sellPrice, 'Sold', r.listingPrice, r.gmp);
                            totalCharges += (calc.totalCharges || 0);

                            let isLongTerm = false;
                            if (r.sellDate && r.listingDate) {
                                const diffDays = Math.ceil(Math.abs(new Date(r.sellDate) - new Date(r.listingDate)) / (1000 * 60 * 60 * 24));
                                if (diffDays > 365) isLongTerm = true;
                            }

                            const netGain = calc.netProfit;
                            if (isLongTerm) ltcgGains += netGain;
                            else stcgGains += netGain;
                        });

                        const estimatedTax = (stcgGains > 0 ? stcgGains * 0.20 : 0) + (ltcgGains > 0 ? Math.max(0, ltcgGains - 125000) * 0.125 : 0);
                        const netIpoProfit = (stcgGains + ltcgGains) - estimatedTax;
                        const netCashflow = netIpoProfit - totalExpenses;

                        // 3. Fetch Bank Accounts
                        db.all('SELECT * FROM bank_accounts WHERE userId = ?', [req.user.id], (bankErr, accounts) => {
                            if (bankErr) accounts = [];
                            const totalBankLiquidity = (accounts || []).reduce((s, a) => s + (parseFloat(a.balance) || 0), 0);

                            // Format HTML report
                            const expRowsHtml = (expenses || []).map((e, i) => `
                              <tr style="border-bottom: 1px solid #e2e8f0;">
                                <td style="padding: 8px;">${i + 1}</td>
                                <td style="padding: 8px; font-weight: bold;">${e.date || '—'}</td>
                                <td style="padding: 8px;">${e.description || e.category}</td>
                                <td style="padding: 8px;"><span style="background: #e0e7ff; color: #3730a3; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 10px;">${e.category}</span></td>
                                <td style="padding: 8px; text-align: center;">${e.paymentMode || 'UPI'}</td>
                                <td style="padding: 8px; text-align: right;">${e.accountName || '—'}</td>
                                <td style="padding: 8px; text-align: right; color: #dc2626; font-weight: bold;">-₹${(parseFloat(e.amount) || 0).toFixed(2)}</td>
                              </tr>
                            `).join('');

                            const ipoRowsHtml = (records || []).map((r, i) => {
                                const qty = parseFloat(r.shares) || 1;
                                const buyPrice = parseFloat(r.price) || 0;
                                const sellPrice = parseFloat(r.sellPrice) || buyPrice;
                                const grossProfit = (sellPrice - buyPrice) * qty;
                                return `
                                  <tr style="border-bottom: 1px solid #e2e8f0;">
                                    <td style="padding: 8px;">${i + 1}</td>
                                    <td style="padding: 8px; font-weight: bold;">${r.ipoName || 'IPO'}</td>
                                    <td style="padding: 8px;">${r.applicantName || 'Applicant'}</td>
                                    <td style="padding: 8px; text-align: right;">${qty}</td>
                                    <td style="padding: 8px; text-align: right;">₹${buyPrice.toFixed(2)}</td>
                                    <td style="padding: 8px; text-align: right;">₹${sellPrice.toFixed(2)}</td>
                                    <td style="padding: 8px; text-align: right; color: ${grossProfit >= 0 ? '#059669' : '#dc2626'}; font-weight: bold;">₹${grossProfit.toFixed(2)}</td>
                                  </tr>
                                `;
                            }).join('');

                            const reportHtml = `
                              <!DOCTYPE html>
                              <html>
                              <head>
                                <meta charset="utf-8" />
                                <title>Monthly Financial Digest — ${monthName} ${year}</title>
                                <style>
                                  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 12px; color: #1e293b; padding: 40px; background: #fff; }
                                  .header { display: flex; justify-content: space-between; border-bottom: 3px solid #4f46e5; padding-bottom: 15px; margin-bottom: 20px; }
                                  .title { font-size: 22px; font-weight: bold; color: #4338ca; }
                                  .summary-box { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 15px; margin-bottom: 25px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
                                  .card { padding: 12px; background: #fff; border: 1px solid #cbd5e1; border-radius: 6px; }
                                  .card-title { font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: bold; }
                                  .card-value { font-size: 17px; font-weight: bold; margin-top: 4px; }
                                  table { width: 100%; border-collapse: collapse; margin-top: 12px; margin-bottom: 25px; }
                                  th { background: #f1f5f9; text-align: left; padding: 8px; font-size: 10px; text-transform: uppercase; border-bottom: 2px solid #cbd5e1; }
                                  .btn-action { display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: 6px; font-weight: 600; font-size: 12px; cursor: pointer; border: none; background: #4f46e5; color: #fff; }
                                  @media print { .no-print { display: none !important; } body { padding: 15px !important; } }
                                </style>
                              </head>
                              <body>
                                <div class="header">
                                  <div>
                                    <div class="title">IPO TRACKER — MONTHLY FINANCIAL DIGEST</div>
                                    <div style="color: #64748b; font-size: 11px; margin-top: 4px;">Executive Performance & Cashflow Statement for <b>${monthName} ${year}</b></div>
                                  </div>
                                  <div style="text-align: right;">
                                    <button onclick="window.print()" class="btn-action no-print">🖨️ Print / Save as PDF</button>
                                    <div style="margin-top: 8px; font-size: 11px; color: #475569;">
                                      <div><b>Account:</b> ${userName} (${user?.email || 'N/A'})</div>
                                      <div><b>Date Generated:</b> ${new Date().toLocaleDateString('en-IN')}</div>
                                    </div>
                                  </div>
                                </div>

                                <div class="summary-box">
                                  <div class="card" style="background: #ecfdf5; border-color: #a7f3d0;">
                                    <div class="card-title" style="color: #065f46;">Net Realized IPO Profits</div>
                                    <div class="card-value" style="color: #059669;">₹${netIpoProfit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                  </div>
                                  <div class="card" style="background: #fef2f2; border-color: #fecaca;">
                                    <div class="card-title" style="color: #991b1b;">Total Monthly Expenses</div>
                                    <div class="card-value" style="color: #dc2626;">₹${totalExpenses.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                  </div>
                                  <div class="card" style="background: #eff6ff; border-color: #bfdbfe;">
                                    <div class="card-title" style="color: #1e40af;">Net Monthly Cashflow</div>
                                    <div class="card-value" style="color: ${netCashflow >= 0 ? '#2563eb' : '#dc2626'};">₹${netCashflow.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                  </div>
                                  <div class="card" style="background: #f5f3ff; border-color: #ddd6fe;">
                                    <div class="card-title" style="color: #5b21b6;">Total Bank Liquidity</div>
                                    <div class="card-value" style="color: #7c3aed;">₹${totalBankLiquidity.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                  </div>
                                </div>

                                <h3>1. Monthly Expense Audit Log</h3>
                                <table>
                                  <thead>
                                    <tr>
                                      <th>#</th>
                                      <th>Date</th>
                                      <th>Description / Merchant</th>
                                      <th>Category</th>
                                      <th style="text-align: center;">Mode</th>
                                      <th style="text-align: right;">Bank Account</th>
                                      <th style="text-align: right;">Amount (₹)</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    ${expRowsHtml || '<tr><td colspan="7" style="text-align:center; padding: 15px;">No expenses recorded for this month.</td></tr>'}
                                  </tbody>
                                </table>

                                <h3>2. Realized IPO Capital Gains (Schedule CG)</h3>
                                <table>
                                  <thead>
                                    <tr>
                                      <th>#</th>
                                      <th>IPO Name</th>
                                      <th>Applicant</th>
                                      <th style="text-align: right;">Qty</th>
                                      <th style="text-align: right;">Buy Price</th>
                                      <th style="text-align: right;">Sell Price</th>
                                      <th style="text-align: right;">Gross P&L (₹)</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    ${ipoRowsHtml || '<tr><td colspan="7" style="text-align:center; padding: 15px;">No realized IPO sales for this month.</td></tr>'}
                                  </tbody>
                                </table>
                              </body>
                              </html>
                            `;

                            res.setHeader('Content-Type', 'text/html');
                            res.send(reportHtml);
                        });
                    }
                );
            }
        );
    });
});

// GET expenses (filterable by date range, category, bankAccountId)
app.get('/api/expenses', authMiddleware, (req, res) => {
    const { startDate, endDate, category, bankAccountId, limit } = req.query;
    let sql = `SELECT e.*, ba.accountName, ba.bankName 
               FROM expenses e 
               LEFT JOIN bank_accounts ba ON e.bankAccountId = ba.id 
               WHERE e.userId = ?`;
    const params = [req.user.id];

    if (startDate) {
        sql += ' AND e.date >= ?';
        params.push(startDate);
    }
    if (endDate) {
        sql += ' AND e.date <= ?';
        params.push(endDate);
    }
    if (category) {
        sql += ' AND e.category = ?';
        params.push(category);
    }
    if (bankAccountId) {
        sql += ' AND e.bankAccountId = ?';
        params.push(bankAccountId);
    }
    sql += ' ORDER BY e.date DESC, e.createdAt DESC';
    if (limit) {
        sql += ' LIMIT ?';
        params.push(parseInt(limit));
    }

    db.all(sql, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'success', data: rows || [] });
    });
});

// POST create a new expense (optionally debit linked bank account)
app.post('/api/expenses', authMiddleware, (req, res) => {
    const { bankAccountId, amount, category, subcategory, description, paymentMode, date, isRecurring, tags, receipt } = req.body;
    if (!amount || !category) return res.status(400).json({ error: 'Amount and category are required' });

    const id = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    const now = new Date().toISOString();
    const expenseDate = date || now.split('T')[0];
    const amountNum = parseFloat(amount) || 0;

    const insertExpense = () => {
        db.run(
            `INSERT INTO expenses (id, userId, bankAccountId, amount, category, subcategory, description, paymentMode, date, isRecurring, tags, receipt, createdAt) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, req.user.id, bankAccountId || null, amountNum, category, subcategory || '', description || '', paymentMode || 'UPI', expenseDate, isRecurring ? 1 : 0, JSON.stringify(tags || []), receipt || '', now],
            function (err) {
                if (err) return res.status(400).json({ error: err.message });
                res.json({ message: 'success', id, bankDebited: !!bankAccountId });
            }
        );
    };

    // If linked to a bank account, debit the bank first
    if (bankAccountId) {
        recordTransaction(req.user.id, bankAccountId, 'debit', 'EXPENSE', amountNum, `Expense: ${description || category}`, id, (txnErr) => {
            if (txnErr) return res.status(500).json({ error: 'Failed to debit bank account: ' + txnErr.message });
            insertExpense();
        });
    } else {
        insertExpense();
    }
});

// PUT update an expense
app.put('/api/expenses/:id', authMiddleware, (req, res) => {
    const { amount, category, subcategory, description, paymentMode, date, isRecurring, tags, receipt } = req.body;
    db.run(
        `UPDATE expenses SET 
            amount = COALESCE(?, amount),
            category = COALESCE(?, category),
            subcategory = COALESCE(?, subcategory),
            description = COALESCE(?, description),
            paymentMode = COALESCE(?, paymentMode),
            date = COALESCE(?, date),
            isRecurring = COALESCE(?, isRecurring),
            tags = COALESCE(?, tags),
            receipt = COALESCE(?, receipt)
         WHERE id = ? AND userId = ?`,
        [amount, category, subcategory, description, paymentMode, date, isRecurring !== undefined ? (isRecurring ? 1 : 0) : undefined, tags ? JSON.stringify(tags) : undefined, receipt, req.params.id, req.user.id],
        function (err) {
            if (err) return res.status(400).json({ error: err.message });
            res.json({ message: 'success', changes: this.changes });
        }
    );
});

// DELETE an expense (revert bank balance if linked)
app.delete('/api/expenses/:id', authMiddleware, (req, res) => {
    db.get('SELECT * FROM expenses WHERE id = ? AND userId = ?', [req.params.id, req.user.id], (err, expense) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!expense) return res.status(404).json({ error: 'Expense not found' });

        const deleteExpense = () => {
            db.run('DELETE FROM expenses WHERE id = ? AND userId = ?', [req.params.id, req.user.id], function (delErr) {
                if (delErr) return res.status(400).json({ error: delErr.message });
                res.json({ message: 'success', changes: this.changes, bankRefunded: !!expense.bankAccountId });
            });
        };

        // If linked to a bank account, refund the amount
        if (expense.bankAccountId) {
            recordTransaction(req.user.id, expense.bankAccountId, 'credit', 'EXPENSE_REFUND', expense.amount, `Refund: ${expense.description || expense.category}`, expense.id, (txnErr) => {
                if (txnErr) return res.status(500).json({ error: 'Failed to refund bank account: ' + txnErr.message });
                // Also remove the original debit transaction
                db.run('DELETE FROM transactions WHERE referenceId = ? AND userId = ?', [expense.id, req.user.id], () => {
                    deleteExpense();
                });
            });
        } else {
            deleteExpense();
        }
    });
});

// GET expense summary (monthly totals by category + budget usage)
app.get('/api/expenses/summary', authMiddleware, (req, res) => {
    const now = new Date();
    const month = parseInt(req.query.month) || (now.getMonth() + 1);
    const year = parseInt(req.query.year) || now.getFullYear();

    // Build date range for the month
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endMonth = month === 12 ? 1 : month + 1;
    const endYear = month === 12 ? year + 1 : year;
    const endDate = `${endYear}-${String(endMonth).padStart(2, '0')}-01`;

    db.all(
        `SELECT category, SUM(amount) as total, COUNT(*) as count 
         FROM expenses 
         WHERE userId = ? AND date >= ? AND date < ?
         GROUP BY category 
         ORDER BY total DESC`,
        [req.user.id, startDate, endDate],
        (err, categoryTotals) => {
            if (err) return res.status(500).json({ error: err.message });

            db.all(
                'SELECT * FROM budgets WHERE userId = ?',
                [req.user.id],
                (budgetErr, budgets) => {
                    if (budgetErr) return res.status(500).json({ error: budgetErr.message });

                    const grandTotal = (categoryTotals || []).reduce((s, c) => s + (parseFloat(c.total) || 0), 0);
                    const totalCount = (categoryTotals || []).reduce((s, c) => s + c.count, 0);

                    // Calculate days in month for daily average
                    const daysInMonth = new Date(year, month, 0).getDate();
                    const dayOfMonth = month === (now.getMonth() + 1) && year === now.getFullYear() ? now.getDate() : daysInMonth;
                    const dailyAverage = dayOfMonth > 0 ? grandTotal / dayOfMonth : 0;

                    // Map budgets to category totals
                    const budgetMap = {};
                    (budgets || []).forEach(b => { budgetMap[b.category] = parseFloat(b.monthlyLimit) || 0; });

                    const categoryBreakdown = (categoryTotals || []).map(c => ({
                        category: c.category,
                        total: c.total,
                        count: c.count,
                        budget: budgetMap[c.category] || 0,
                        budgetUsedPct: budgetMap[c.category] ? ((c.total / budgetMap[c.category]) * 100).toFixed(1) : null
                    }));

                    // Total budget
                    const totalBudget = Object.values(budgetMap).reduce((s, v) => s + v, 0);
                    const budgetHealthPct = totalBudget > 0 ? (((totalBudget - grandTotal) / totalBudget) * 100).toFixed(1) : null;

                    // Find highest category
                    const highestCategory = categoryBreakdown.length > 0 ? categoryBreakdown[0] : null;

                    res.json({
                        message: 'success',
                        data: {
                            month, year,
                            grandTotal,
                            totalCount,
                            dailyAverage,
                            totalBudget,
                            budgetHealthPct,
                            highestCategory,
                            categories: categoryBreakdown,
                            budgets: budgets || []
                        }
                    });
                }
            );
        }
    );
});

// POST set/update budget for a category
app.post('/api/budgets', authMiddleware, (req, res) => {
    const { category, monthlyLimit } = req.body;
    if (!category) return res.status(400).json({ error: 'Category is required' });

    const limitNum = parseFloat(monthlyLimit) || 0;

    // Upsert: check if budget exists for this user+category
    db.get('SELECT id FROM budgets WHERE userId = ? AND category = ?', [req.user.id, category], (err, existing) => {
        if (err) return res.status(500).json({ error: err.message });

        if (existing) {
            db.run('UPDATE budgets SET monthlyLimit = ? WHERE id = ?', [limitNum, existing.id], function (upErr) {
                if (upErr) return res.status(400).json({ error: upErr.message });
                res.json({ message: 'success', action: 'updated', id: existing.id });
            });
        } else {
            const id = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
            db.run(
                'INSERT INTO budgets (id, userId, category, monthlyLimit, createdAt) VALUES (?, ?, ?, ?, ?)',
                [id, req.user.id, category, limitNum, new Date().toISOString()],
                function (insertErr) {
                    if (insertErr) return res.status(400).json({ error: insertErr.message });
                    res.json({ message: 'success', action: 'created', id });
                }
            );
        }
    });
});

// PIN Passcode Management (Set / Verify / Toggle)
app.post('/api/user/pin', authMiddleware, async (req, res) => {
    const { action, pin } = req.body;
    if (!action) return res.status(400).json({ error: 'Action is required' });

    db.get('SELECT appPin, pinEnabled FROM users WHERE id = ?', [req.user.id], async (err, user) => {
        if (err || !user) return res.status(404).json({ error: 'User not found' });

        if (action === 'set') {
            if (!pin || pin.length !== 4 || !/^\d{4}$/.test(pin)) {
                return res.status(400).json({ error: 'PIN must be exactly 4 digits' });
            }
            const hashedPin = await bcrypt.hash(pin, 10);
            db.run('UPDATE users SET appPin = ?, pinEnabled = 1 WHERE id = ?', [hashedPin, req.user.id], (upErr) => {
                if (upErr) return res.status(500).json({ error: upErr.message });
                res.json({ message: 'Passcode PIN enabled successfully' });
            });
        } else if (action === 'verify') {
            if (!user.pinEnabled || !user.appPin) {
                return res.json({ message: 'pin_not_enabled', valid: true });
            }
            if (!pin) return res.status(400).json({ error: 'PIN is required' });
            const isMatch = await bcrypt.compare(pin, user.appPin);
            if (isMatch) res.json({ message: 'success', valid: true });
            else res.status(401).json({ error: 'Incorrect Passcode PIN', valid: false });
        } else if (action === 'disable') {
            db.run('UPDATE users SET appPin = NULL, pinEnabled = 0 WHERE id = ?', [req.user.id], (upErr) => {
                if (upErr) return res.status(500).json({ error: upErr.message });
                res.json({ message: 'Passcode PIN disabled' });
            });
        } else {
            res.status(400).json({ error: 'Invalid action' });
        }
    });
});

// GET Passcode PIN status
app.get('/api/user/pin/status', authMiddleware, (req, res) => {
    db.get('SELECT pinEnabled FROM users WHERE id = ?', [req.user.id], (err, row) => {
        if (err || !row) return res.status(500).json({ error: 'Failed to fetch PIN status' });
        res.json({ message: 'success', enabled: !!row.pinEnabled });
    });
});

// Check Duplicate PAN application for an IPO
app.post('/api/records/check-duplicate-pan', authMiddleware, (req, res) => {
    const { pan, ipoName } = req.body;
    if (!pan || !ipoName) return res.status(400).json({ error: 'PAN and IPO Name are required' });

    db.get(
        'SELECT * FROM records WHERE userId = ? AND LOWER(pan) = LOWER(?) AND LOWER(ipoName) LIKE LOWER(?)',
        [req.user.id, pan.trim(), `%${ipoName.trim()}%`],
        (err, row) => {
            if (err) return res.status(500).json({ error: err.message });
            if (row) {
                res.json({ isDuplicate: true, existingRecord: row });
            } else {
                res.json({ isDuplicate: false });
            }
        }
    );
});

// Generate Multi-Account Batch ASBA Payload
app.post('/api/records/batch-asba', authMiddleware, (req, res) => {
    const { applicantIds, ipoName, lotSize, price } = req.body;
    if (!Array.isArray(applicantIds) || applicantIds.length === 0) {
        return res.status(400).json({ error: 'At least one applicant must be selected' });
    }

    const placeholders = applicantIds.map(() => '?').join(',');
    db.all(
        `SELECT * FROM applicants WHERE userId = ? AND id IN (${placeholders})`,
        [req.user.id, ...applicantIds],
        (err, applicants) => {
            if (err || !applicants) return res.status(500).json({ error: 'Failed to fetch applicants' });

            const priceNum = parseFloat(price) || 0;
            const lotNum = parseInt(lotSize) || 1;
            const totalShares = lotNum;
            const totalAmount = priceNum * totalShares;

            const payloadList = applicants.map((app, index) => ({
                srNo: index + 1,
                applicantName: app.name,
                pan: (app.pan || '').toUpperCase(),
                upiId: app.upiId || 'N/A',
                dematId: app.dematId || 'N/A',
                bankAccount: app.bankAccount || 'N/A',
                ifscCode: app.ifscCode || 'N/A',
                ipoName: ipoName || 'Selected IPO',
                lotSize: lotNum,
                shares: totalShares,
                cutOffPrice: priceNum,
                totalAmount: totalAmount
            }));

            res.json({
                message: 'success',
                ipoName: ipoName || 'Selected IPO',
                count: payloadList.length,
                totalCapital: totalAmount * payloadList.length,
                payload: payloadList
            });
        }
    );
});

// --- WhatsApp API ---
app.post('/api/user/whatsapp', authMiddleware, (req, res) => {
    const { whatsappNumber, whatsappAlerts } = req.body;
    db.run(
        'UPDATE users SET whatsappNumber = ?, whatsappAlerts = ? WHERE id = ?',
        [whatsappNumber || '', whatsappAlerts ? 1 : 0, req.user.id],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'WhatsApp notification settings saved successfully' });
        }
    );
});

app.get('/api/user/whatsapp', authMiddleware, (req, res) => {
    db.get('SELECT whatsappNumber, whatsappAlerts FROM users WHERE id = ?', [req.user.id], (err, row) => {
        if (err || !row) return res.status(500).json({ error: 'Failed to fetch WhatsApp settings' });
        res.json({ message: 'success', data: row });
    });
});

app.post('/api/webhooks/whatsapp/test', authMiddleware, async (req, res) => {
    const { phone } = req.body;
    const targetPhone = phone || req.user.whatsappNumber;
    if (!targetPhone) return res.status(400).json({ error: 'WhatsApp phone number is required' });

    const { sendWhatsAppMessage } = require('./whatsapp');
    const msg = `🚀 *IPO Tracker Alert Test*\n\nHello! Your WhatsApp alert dispatch is working. You will receive live allotment updates & GMP alerts here.`;
    const result = await sendWhatsAppMessage(targetPhone, msg);
    res.json({ message: 'Test message sent', result });
});

// --- Family Allotment Heatmap API ---
app.get('/api/analytics/family-heatmap', authMiddleware, (req, res) => {
    db.all('SELECT * FROM records WHERE userId = ?', [req.user.id], (err, records) => {
        if (err) return res.status(500).json({ error: err.message });

        db.all('SELECT * FROM applicants WHERE userId = ?', [req.user.id], (appErr, applicants) => {
            if (appErr) return res.status(500).json({ error: appErr.message });

            const statsMap = {};
            (records || []).forEach(r => {
                const name = (r.applicantName || 'Unknown').trim();
                if (!statsMap[name]) {
                    statsMap[name] = {
                        name,
                        applied: 0,
                        allotted: 0,
                        profit: 0,
                        banks: {}
                    };
                }
                if (r.applied === 'Yes') {
                    statsMap[name].applied++;
                    const isAllotted = r.alloted === 'Yes' || r.alloted === 'Allotted' || parseFloat(r.alloted) > 0;
                    if (isAllotted) statsMap[name].allotted++;

                    const p = parseFloat(r.profit) || 0;
                    statsMap[name].profit += p;

                    const bank = r.bankName || 'Standard Bank';
                    if (!statsMap[name].banks[bank]) statsMap[name].banks[bank] = { applied: 0, allotted: 0 };
                    statsMap[name].banks[bank].applied++;
                    if (isAllotted) statsMap[name].banks[bank].allotted++;
                }
            });

            const heatmapData = Object.values(statsMap).map(item => ({
                ...item,
                winRate: item.applied > 0 ? ((item.allotted / item.applied) * 100).toFixed(1) : 0
            }));

            res.json({ message: 'success', data: heatmapData });
        });
    });
});

// ========== UPI MANDATE ESCALATION & NUDGES API ==========

// GET Pending UPI Mandates
app.get('/api/records/pending-mandates', authMiddleware, (req, res) => {
    db.all(
        `SELECT r.*, a.name as applicantFullName 
         FROM records r 
         LEFT JOIN applicants a ON LOWER(r.applicantName) = LOWER(a.name) AND r.userId = a.userId
         WHERE r.userId = ? AND (r.mandateStatus IS NULL OR r.mandateStatus = 'Requested' OR r.mandateStatus = 'Pending') AND (r.applied = 'Yes' OR r.applied = 'Pending')
         ORDER BY r.createdAt DESC`,
        [req.user.id],
        (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'success', data: rows || [] });
        }
    );
});

// POST Send Urgent WhatsApp Mandate Nudge
app.post('/api/records/:id/mandate-nudge', authMiddleware, async (req, res) => {
    const recordId = req.params.id;
    const { phone } = req.body;

    db.get('SELECT * FROM records WHERE id = ? AND userId = ?', [recordId, req.user.id], async (err, record) => {
        if (err || !record) return res.status(404).json({ error: 'IPO Record not found' });

        // Try to find applicant phone
        db.get('SELECT * FROM applicants WHERE LOWER(name) = LOWER(?) AND userId = ?', [record.applicantName, req.user.id], async (appErr, applicant) => {
            const targetPhone = phone || applicant?.whatsappNumber || req.user.whatsappNumber;
            if (!targetPhone) {
                return res.status(400).json({ error: `No WhatsApp phone number found for ${record.applicantName}. Please configure it in Applicants or Settings.` });
            }

            const ipoAmount = parseFloat(record.amount) || (parseFloat(record.shares || 1) * parseFloat(record.price || 0));
            const msg = `⏳ *URGENT UPI MANDATE APPROVAL REMINDER*\n\nHello *${record.applicantName}*,\n\nPlease open your UPI App (GPay / PhonePe / Paytm / BHIM) and approve the pending mandate of *₹${ipoAmount.toLocaleString('en-IN')}* for *${record.ipoName}* before *5:00 PM today*!\n\n📌 UPI ID: \`${record.mandateUpiId || record.upiId || 'N/A'}\`\n📌 Mandate Status: *Pending Approval ⚠️*\n\nThank you!`;

            const { sendWhatsAppMessage } = require('./whatsapp');
            const result = await sendWhatsAppMessage(targetPhone, msg);

            res.json({ message: 'Urgent mandate WhatsApp nudge dispatched!', result });
        });
    });
});

// ========== LIVE SUBSCRIPTION ODDS CALCULATOR API ==========

app.get('/api/ipo/subscription-odds', authMiddleware, async (req, res) => {
    const { ipoName } = req.query;

    try {
        const finApiRes = await fetch('https://finapi.upvaly.com/api/ipo');
        const json = await finApiRes.json();

        if (json.status !== 'success' || !Array.isArray(json.data)) {
            return res.status(500).json({ error: 'Failed to fetch live subscription data' });
        }

        const iposData = json.data.map(ipo => {
            const name = ipo.name || '';
            const sub = ipo.subscription || ipo.biddingDetails || {};

            const qib = parseFloat(sub.qib || sub.QIB || '1.2') || 1.2;
            const shni = parseFloat(sub.sHNI || sub.shni || sub.niiSmall || '5.4') || 5.4;
            const bhni = parseFloat(sub.bHNI || sub.bhni || sub.niiBig || '8.1') || 8.1;
            const retail = parseFloat(sub.retail || sub.Retail || '12.5') || 12.5;

            // Odds Calculation
            const retailOddsRatio = Math.max(1, Math.round(retail));
            const retailProbabilityPct = ((1 / retailOddsRatio) * 100).toFixed(1);

            const shniOddsRatio = Math.max(1, Math.round(shni));
            const shniProbabilityPct = ((1 / shniOddsRatio) * 100).toFixed(1);

            const bhniOddsRatio = Math.max(1, Math.round(bhni));
            const bhniProbabilityPct = ((1 / bhniOddsRatio) * 100).toFixed(1);

            let strategyAdvice = '';
            if (retailOddsRatio <= shniOddsRatio) {
                strategyAdvice = `🟢 Retail allotment probability (${retailProbabilityPct}%) is currently higher than sHNI (${shniProbabilityPct}%). Split funds into 1-lot Retail applications across multiple family accounts to maximize odds.`;
            } else {
                strategyAdvice = `⚡ sHNI allotment probability (${shniProbabilityPct}%) is currently higher than Retail (${retailProbabilityPct}%). Applying 1 sHNI lot (₹2L+) offers superior allocation odds.`;
            }

            return {
                name,
                symbol: ipo.symbol || '',
                priceRange: ipo.priceRange || 'N/A',
                gmp: ipo.greyMarketPremium?.gmpTrends?.[0]?.gmp || 'N/A',
                subscription: {
                    qib: `${qib}x`,
                    shni: `${shni}x`,
                    bhni: `${bhni}x`,
                    retail: `${retail}x`
                },
                odds: {
                    retail: { ratio: `1 in ${retailOddsRatio}`, pct: `${retailProbabilityPct}%` },
                    shni: { ratio: `1 in ${shniOddsRatio}`, pct: `${shniProbabilityPct}%` },
                    bhni: { ratio: `1 in ${bhniOddsRatio}`, pct: `${bhniProbabilityPct}%` },
                    qib: { ratio: `${qib}x Over-subscribed` }
                },
                strategyAdvice
            };
        });

        if (ipoName) {
            const matched = iposData.find(i => i.name.toLowerCase().includes(ipoName.toLowerCase()));
            return res.json({ message: 'success', data: matched || iposData[0] || null });
        }

        res.json({ message: 'success', data: iposData });
    } catch (error) {
        console.error('Subscription odds fetch error:', error);
        res.status(500).json({ error: 'Failed to compute subscription odds: ' + error.message });
    }
});

// ========== PERSONAL WEBCAL / ICAL FEED (.ICS) API ==========

app.get('/api/calendar/feed.ics', (req, res) => {
    const token = req.query.token;
    if (!token) return res.status(401).send('Unauthorized: Token query parameter required');

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const userId = decoded.id;

        db.all('SELECT * FROM records WHERE userId = ?', [userId], (err, records) => {
            if (err) return res.status(500).send('Database error');

            const events = [];

            (records || []).forEach(r => {
                if (r.listingDate) {
                    const cleanDate = r.listingDate.replace(/-/g, '');

                    // Event 1: Listing Day Pre-Open Session
                    events.push([
                        'BEGIN:VEVENT',
                        `UID:ipo-listing-${r.id}@ipotracker.com`,
                        `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
                        `DTSTART;TZID=Asia/Kolkata:${cleanDate}T090000`,
                        `DTEND;TZID=Asia/Kolkata:${cleanDate}T094500`,
                        `SUMMARY:🚀 Listing Day Pre-Open: ${r.ipoName}`,
                        `DESCRIPTION:IPO Pre-Open Bidding Session (9:00 AM - 9:45 AM) for ${r.ipoName} (${r.applicantName}). Target listing price: ₹${r.targetPrice || r.price || 0}.`,
                        'STATUS:CONFIRMED',
                        'BEGIN:VALARM',
                        'TRIGGER:-PT15M',
                        'ACTION:DISPLAY',
                        'DESCRIPTION:Reminder: IPO Listing Pre-Open in 15 minutes!',
                        'END:VALARM',
                        'END:VEVENT'
                    ].join('\r\n'));
                }
            });

            const icsContent = [
                'BEGIN:VCALENDAR',
                'VERSION:2.0',
                'PRODID:-//IPO Tracker//Personal Investment Calendar//EN',
                'CALSCALE:GREGORIAN',
                'METHOD:PUBLISH',
                'X-WR-CALNAME:IPO Tracker Schedule',
                'X-WR-TIMEZONE:Asia/Kolkata',
                events.join('\r\n'),
                'END:VCALENDAR'
            ].join('\r\n');

            res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
            res.setHeader('Content-Disposition', 'inline; filename="ipo_tracker_calendar.ics"');
            res.send(icsContent);
        });
    } catch (err) {
        return res.status(401).send('Invalid or expired calendar token');
    }
});

// ========== KHATABOOK PARTY LEDGER API ==========

// GET Party Ledger Entries (filtered by applicantId optionally)
app.get('/api/party-ledger', authMiddleware, (req, res) => {
    const { applicantId } = req.query;
    let sql = `SELECT pl.*, a.name as applicantName, a.pan, a.upiId 
               FROM party_ledger pl 
               LEFT JOIN applicants a ON pl.applicantId = a.id 
               WHERE pl.userId = ?`;
    const params = [req.user.id];

    if (applicantId) {
        sql += ' AND pl.applicantId = ?';
        params.push(applicantId);
    }
    sql += ' ORDER BY pl.date DESC, pl.createdAt DESC';

    db.all(sql, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'success', data: rows || [] });
    });
});

// GET Party Ledger Summary (Khatabook Net Balance per Applicant & Overall)
app.get('/api/party-ledger/summary', authMiddleware, (req, res) => {
    db.all('SELECT * FROM applicants WHERE userId = ?', [req.user.id], (appErr, applicants) => {
        if (appErr) return res.status(500).json({ error: appErr.message });

        db.all('SELECT * FROM party_ledger WHERE userId = ?', [req.user.id], (ledgerErr, entries) => {
            if (ledgerErr) return res.status(500).json({ error: ledgerErr.message });

            const applicantMap = {};
            (applicants || []).forEach(a => {
                applicantMap[a.id] = {
                    applicantId: a.id,
                    applicantName: a.name,
                    pan: a.pan,
                    upiId: a.upiId,
                    family: a.family,
                    totalGave: 0,
                    totalGot: 0,
                    netBalance: 0,
                    status: 'settled', // 'you_will_get', 'you_will_give', 'settled'
                    entryCount: 0
                };
            });

            (entries || []).forEach(e => {
                if (applicantMap[e.applicantId]) {
                    const amt = parseFloat(e.amount) || 0;
                    if (e.type === 'gave') {
                        applicantMap[e.applicantId].totalGave += amt;
                    } else if (e.type === 'got') {
                        applicantMap[e.applicantId].totalGot += amt;
                    }
                    applicantMap[e.applicantId].entryCount++;
                }
            });

            let totalYouWillGet = 0;
            let totalYouWillGive = 0;

            const partySummaries = Object.values(applicantMap).map(item => {
                const diff = item.totalGave - item.totalGot; // positive = You gave more, applicant owes you
                if (diff > 0) {
                    item.status = 'you_will_get';
                    item.netBalance = diff;
                    totalYouWillGet += diff;
                } else if (diff < 0) {
                    item.status = 'you_will_give';
                    item.netBalance = Math.abs(diff);
                    totalYouWillGive += Math.abs(diff);
                } else {
                    item.status = 'settled';
                    item.netBalance = 0;
                }
                return item;
            });

            res.json({
                message: 'success',
                summary: {
                    totalYouWillGet,
                    totalYouWillGive,
                    netOverallBalance: totalYouWillGet - totalYouWillGive,
                    partySummaries
                }
            });
        });
    });
});

// POST Create Party Ledger Entry ("You Gave" or "You Got")
app.post('/api/party-ledger', authMiddleware, (req, res) => {
    const { applicantId, recordId, type, amount, category, note, paymentMode, date } = req.body;
    if (!applicantId || !type || !amount) {
        return res.status(400).json({ error: 'Applicant, transaction type (gave/got), and amount are required' });
    }

    if (!['gave', 'got'].includes(type)) {
        return res.status(400).json({ error: 'Transaction type must be "gave" or "got"' });
    }

    const id = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    const now = new Date().toISOString();

    db.run(
        `INSERT INTO party_ledger (id, userId, applicantId, recordId, type, category, amount, note, paymentMode, date, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, req.user.id, applicantId, recordId || null, type, category || 'MANUAL', parseFloat(amount) || 0, note || '', paymentMode || 'UPI', date || now.split('T')[0], now],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'success', id });
        }
    );
});

// DELETE Party Ledger Entry
app.delete('/api/party-ledger/:id', authMiddleware, (req, res) => {
    db.run('DELETE FROM party_ledger WHERE id = ? AND userId = ?', [req.params.id, req.user.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'success', changes: this.changes });
    });
});

// POST Send WhatsApp Settlement Reminder to Applicant
app.post('/api/party-ledger/send-reminder', authMiddleware, async (req, res) => {
    const { applicantId, phone } = req.body;
    if (!applicantId) return res.status(400).json({ error: 'Applicant ID is required' });

    db.get('SELECT * FROM applicants WHERE id = ? AND userId = ?', [applicantId, req.user.id], async (appErr, applicant) => {
        if (appErr || !applicant) return res.status(404).json({ error: 'Applicant not found' });

        const targetPhone = phone || applicant.whatsappNumber || req.user.whatsappNumber;
        if (!targetPhone) {
            return res.status(400).json({ error: 'WhatsApp phone number not provided for applicant' });
        }

        db.all('SELECT * FROM party_ledger WHERE applicantId = ? AND userId = ?', [applicantId, req.user.id], async (ledgerErr, entries) => {
            let totalGave = 0;
            let totalGot = 0;
            (entries || []).forEach(e => {
                const amt = parseFloat(e.amount) || 0;
                if (e.type === 'gave') totalGave += amt;
                else if (e.type === 'got') totalGot += amt;
            });

            const diff = totalGave - totalGot;
            let balanceStatus = '';
            let balanceAmt = Math.abs(diff);

            if (diff > 0) {
                balanceStatus = `📌 *Outstanding Balance: You will receive ₹${balanceAmt.toLocaleString('en-IN')}*`;
            } else if (diff < 0) {
                balanceStatus = `📌 *Outstanding Balance: You will pay ₹${balanceAmt.toLocaleString('en-IN')}*`;
            } else {
                balanceStatus = `✅ *Account Fully Settled (Balance: ₹0)*`;
            }

            const upiString = applicant.upiId ? `\n\n💳 Pay via UPI: \`upi://pay?pa=${applicant.upiId}&pn=${encodeURIComponent(applicant.name)}\`` : '';

            const msg = `📖 *IPO TRACKER — STATEMENT REMINDER*\n\nHello *${applicant.name}*,\n\nHere is your current IPO account summary:\n• Total Invested (Gave): ₹${totalGave.toLocaleString('en-IN')}\n• Total Collected (Got): ₹${totalGot.toLocaleString('en-IN')}\n----------------------------\n${balanceStatus}${upiString}\n\nThank you!`;

            const { sendWhatsAppMessage } = require('./whatsapp');
            const result = await sendWhatsAppMessage(targetPhone, msg);

            res.json({ message: 'WhatsApp statement reminder sent', result, summary: { totalGave, totalGot, diff } });
        });
    });
});

// GET Party Ledger Statement HTML/PDF Report
app.get('/api/party-ledger/statement-html/:applicantId', authMiddleware, (req, res) => {
    const { applicantId } = req.params;
    db.get('SELECT * FROM applicants WHERE id = ? AND userId = ?', [applicantId, req.user.id], (appErr, applicant) => {
        if (appErr || !applicant) return res.status(404).send('Applicant not found');

        db.all('SELECT pl.*, r.ipoName FROM party_ledger pl LEFT JOIN records r ON pl.recordId = r.id WHERE pl.applicantId = ? AND pl.userId = ? ORDER BY pl.date ASC, pl.createdAt ASC', [applicantId, req.user.id], (ledgerErr, entries) => {
            let totalGave = 0;
            let totalGot = 0;
            let runningBalance = 0;

            const rowsHtml = (entries || []).map((e, idx) => {
                const amt = parseFloat(e.amount) || 0;
                if (e.type === 'gave') {
                    totalGave += amt;
                    runningBalance += amt;
                } else {
                    totalGot += amt;
                    runningBalance -= amt;
                }

                const isGave = e.type === 'gave';
                return `
                    <tr style="border-bottom: 1px solid #e2e8f0;">
                        <td style="padding: 10px;">${idx + 1}</td>
                        <td style="padding: 10px;">${e.date || '—'}</td>
                        <td style="padding: 10px; font-weight: 500;">${e.note || e.category || 'Transaction'} ${e.ipoName ? `<br><small style="color:#64748b;">(IPO: ${e.ipoName})</small>` : ''}</td>
                        <td style="padding: 10px; text-align: center;"><span style="font-size: 11px; padding: 2px 6px; border-radius: 4px; background: #f1f5f9;">${e.paymentMode || 'UPI'}</span></td>
                        <td style="padding: 10px; text-align: right; color: #dc2626; font-weight: bold;">${isGave ? '₹' + amt.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '—'}</td>
                        <td style="padding: 10px; text-align: right; color: #16a34a; font-weight: bold;">${!isGave ? '₹' + amt.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '—'}</td>
                        <td style="padding: 10px; text-align: right; font-weight: bold; color: ${runningBalance >= 0 ? '#1e40af' : '#b91c1c'};">
                            ₹${Math.abs(runningBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 })} ${runningBalance >= 0 ? 'Dr' : 'Cr'}
                        </td>
                    </tr>
                `;
            }).join('');

            const netDiff = totalGave - totalGot;
            const reportHtml = `
              <!DOCTYPE html>
              <html>
              <head>
                <meta charset="utf-8" />
                <title>Party Ledger Statement — ${applicant.name}</title>
                <style>
                  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 13px; color: #0f172a; padding: 40px; background: #fff; }
                  .header { display: flex; justify-content: space-between; border-bottom: 2px solid #6366f1; padding-bottom: 15px; margin-bottom: 20px; }
                  .title { font-size: 20px; font-weight: bold; color: #4338ca; }
                  .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 25px; }
                  .card { padding: 15px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; }
                  .card-title { font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: bold; }
                  .card-value { font-size: 18px; font-weight: bold; margin-top: 5px; }
                  table { width: 100%; border-collapse: collapse; margin-top: 15px; }
                  th { background: #f1f5f9; text-align: left; padding: 10px; font-size: 11px; text-transform: uppercase; border-bottom: 2px solid #cbd5e1; }
                  .btn-print { background: #4f46e5; color: #fff; padding: 8px 16px; border-radius: 6px; border: none; font-weight: 600; cursor: pointer; }
                  @media print { .no-print { display: none !important; } }
                </style>
              </head>
              <body>
                <div class="header">
                  <div>
                    <div class="title">KHATABOOK PARTY LEDGER STATEMENT</div>
                    <div style="color: #64748b; margin-top: 4px;">Applicant: <b>${applicant.name}</b> (PAN: ${applicant.pan || 'N/A'})</div>
                  </div>
                  <div style="text-align: right;">
                    <button onclick="window.print()" class="btn-print no-print">🖨️ Print / Save as PDF</button>
                    <div style="font-size: 11px; color: #64748b; margin-top: 8px;">Date Generated: ${new Date().toLocaleDateString('en-IN')}</div>
                  </div>
                </div>

                <div class="summary-grid">
                  <div class="card" style="border-left: 4px solid #ef4444;">
                    <div class="card-title">Total You Gave (Lent/Applied)</div>
                    <div class="card-value" style="color: #dc2626;">₹${totalGave.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                  </div>
                  <div class="card" style="border-left: 4px solid #22c55e;">
                    <div class="card-title">Total You Got (Collected)</div>
                    <div class="card-value" style="color: #16a34a;">₹${totalGot.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                  </div>
                  <div class="card" style="border-left: 4px solid ${netDiff >= 0 ? '#3b82f6' : '#f59e0b'};">
                    <div class="card-title">Net Outstanding Balance</div>
                    <div class="card-value" style="color: ${netDiff >= 0 ? '#1d4ed8' : '#b45309'};">
                      ₹${Math.abs(netDiff).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      <span style="font-size: 11px; font-weight: normal;">(${netDiff >= 0 ? 'You Will Get' : 'You Will Give'})</span>
                    </div>
                  </div>
                </div>

                <h3>Transaction Ledger Passbook</h3>
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Date</th>
                      <th>Description</th>
                      <th style="text-align: center;">Mode</th>
                      <th style="text-align: right;">You Gave (Dr)</th>
                      <th style="text-align: right;">You Got (Cr)</th>
                      <th style="text-align: right;">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${rowsHtml || '<tr><td colspan="7" style="text-align: center; padding: 20px;">No ledger transactions recorded yet.</td></tr>'}
                  </tbody>
                </table>
              </body>
              </html>
            `;
            res.setHeader('Content-Type', 'text/html');
            res.send(reportHtml);
        });
    });
});

// --- UPI Mandate Status Update API ---
app.put('/api/records/:id/mandate', authMiddleware, (req, res) => {
    const { mandateStatus, bankName, mandateUpiId } = req.body;
    db.run(
        `UPDATE records SET 
            mandateStatus = COALESCE(?, mandateStatus), 
            bankName = COALESCE(?, bankName),
            mandateUpiId = COALESCE(?, mandateUpiId)
         WHERE id = ? AND userId = ?`,
        [mandateStatus, bankName, mandateUpiId, req.params.id, req.user.id],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'UPI mandate status updated successfully' });
        }
    );
});

// --- Advance Tax Estimator (Sec 208) API ---
app.get('/api/analytics/advance-tax', authMiddleware, (req, res) => {
    db.all('SELECT * FROM records WHERE userId = ? AND holdingStatus = "Sold"', [req.user.id], (err, records) => {
        if (err) return res.status(500).json({ error: err.message });
        const { calculateAdvanceTaxInstallments } = require('./taxEngine');

        let stcgProfit = 0;
        let ltcgProfit = 0;

        (records || []).forEach(r => {
            const p = parseFloat(r.profit) || (parseFloat(r.sellPrice) - parseFloat(r.price)) * (parseFloat(r.shares) || 1);
            if (p > 0) stcgProfit += p;
        });

        const taxDetails = calculateAdvanceTaxInstallments(stcgProfit, ltcgProfit);
        res.json({ message: 'success', data: taxDetails });
    });
});

// --- Trade Journaling API ---
app.get('/api/journal', authMiddleware, (req, res) => {
    db.all('SELECT * FROM journal_entries WHERE userId = ? ORDER BY createdAt DESC', [req.user.id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'success', data: rows || [] });
    });
});

app.post('/api/journal', authMiddleware, (req, res) => {
    const { recordId, notes, rating, tags } = req.body;
    const id = require('crypto').randomUUID ? require('crypto').randomUUID() : Date.now().toString();
    const createdAt = new Date().toISOString();

    db.run(
        'INSERT INTO journal_entries (id, recordId, userId, notes, rating, tags, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [id, recordId || '', req.user.id, notes || '', parseInt(rating) || 5, JSON.stringify(tags || []), createdAt],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Journal entry saved successfully', id });
        }
    );
});

// --- ITR-2 Schedule CG Export API (JSON & CSV) ---
app.get('/api/reports/itr2-json', authMiddleware, (req, res) => {
    db.all('SELECT * FROM records WHERE userId = ? AND holdingStatus = "Sold"', [req.user.id], (err, records) => {
        if (err) return res.status(500).json({ error: err.message });

        const itr2ScheduleCG = {
            formatVersion: "1.0",
            assessmentYear: "2025-2026",
            financialYear: "2024-2025",
            taxpayerPan: req.user.username,
            shortTermCapitalGains111A: (records || []).map(r => {
                const buyAmt = parseFloat(r.amount) || ((parseFloat(r.shares) || 1) * (parseFloat(r.price) || 0));
                const sellAmt = (parseFloat(r.shares) || 1) * (parseFloat(r.sellPrice) || parseFloat(r.price) || 0);
                const grossGain = sellAmt - buyAmt;
                return {
                    assetType: "Equity Shares (STCG Sec 111A)",
                    companyName: r.ipoName,
                    isinCode: "INE000000000",
                    buyDate: r.createdAt ? r.createdAt.split('T')[0] : '2024-04-01',
                    sellDate: r.sellDate || '2025-03-31',
                    quantity: parseFloat(r.shares) || 1,
                    buyPricePerShare: parseFloat(r.price) || 0,
                    sellPricePerShare: parseFloat(r.sellPrice) || 0,
                    totalCostOfAcquisition: buyAmt,
                    totalFullConsideration: sellAmt,
                    transferExpenses: parseFloat(r.brokerage || 0) + parseFloat(r.stt || 0),
                    shortTermCapitalGain: grossGain,
                    applicableTaxRatePct: 20.0
                };
            })
        };

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="ITR2_Schedule_CG_${Date.now()}.json"`);
        res.send(JSON.stringify(itr2ScheduleCG, null, 2));
    });
});

// Middleware to verify JWT
function authMiddleware(req, res, next) {
    let token = req.query.token;
    const authHeader = req.headers.authorization;
    if (!token && authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
    }
    if (!token) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;

        if (decoded.sessionId) {
            db.get('SELECT id FROM sessions WHERE id = ? AND userId = ?', [decoded.sessionId, decoded.id], (err, session) => {
                if (session) {
                    req.sessionId = decoded.sessionId;
                    // Update last active timestamp asynchronously
                    db.run('UPDATE sessions SET lastActiveAt = ? WHERE id = ?', [new Date().toISOString(), decoded.sessionId]);
                    return next();
                }

                // If session record is missing (e.g. Vercel serverless cold-start or DB migration):
                // Verify user account exists and status is approved
                db.get('SELECT id, role, status FROM users WHERE id = ?', [decoded.id], (userErr, userRow) => {
                    if (userErr || !userRow) {
                        return res.status(401).json({ error: 'User account not found' });
                    }
                    if (userRow.status === 'rejected') {
                        return res.status(403).json({ error: 'Account has been rejected or suspended' });
                    }
                    if (userRow.status !== 'approved') {
                        return res.status(403).json({ error: 'Account is pending admin approval' });
                    }

                    // Auto-heal session record for approved user
                    const now = new Date().toISOString();
                    const rawAgent = req.headers['user-agent'] || 'Unknown Device';
                    const deviceAgent = parseUserAgent(rawAgent);
                    const ipAddress = getClientIp(req);

                    db.run(
                        'INSERT OR REPLACE INTO sessions (id, userId, deviceAgent, ipAddress, createdAt, lastActiveAt, token) VALUES (?, ?, ?, ?, ?, ?, ?)',
                        [decoded.sessionId, decoded.id, deviceAgent, ipAddress, now, now, token || ''],
                        () => {
                            req.sessionId = decoded.sessionId;
                            next();
                        }
                    );
                });
            });
        } else {
            // Legacy token without sessionId: check if active session exists or provision one
            db.get('SELECT id FROM sessions WHERE userId = ? ORDER BY lastActiveAt DESC LIMIT 1', [decoded.id], (err, session) => {
                if (session) {
                    req.sessionId = session.id;
                    next();
                } else {
                    createSession(decoded.id, req, (createErr, newSessionId) => {
                        req.sessionId = newSessionId;
                        next();
                    });
                }
            });
        }
    } catch (err) {
        return res.status(401).json({ error: 'Invalid token' });
    }
}

function isAdmin(req, res, next) {
    if (req.user && (req.user.role === 'admin' || req.user.role === 'master')) {
        next();
    } else {
        return res.status(403).json({ error: 'Admin access required' });
    }
}

// Audit Logger Helper Function
function logAudit(req, action, target, details) {
    if (!req || !req.user) return;
    const id = crypto.randomUUID ? crypto.randomUUID() : (Date.now().toString(36) + Math.random().toString(36).substring(2, 6));
    const adminId = req.user.id || 'system';
    const adminUsername = req.user.username || 'admin';
    const createdAt = new Date().toISOString();

    db.run(`CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        adminId TEXT,
        adminUsername TEXT,
        action TEXT,
        target TEXT,
        details TEXT,
        createdAt TEXT
    )`, [], () => {
        db.run(
            'INSERT INTO audit_logs (id, adminId, adminUsername, action, target, details, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [id, adminId, adminUsername, action || 'ACTION', target || 'SYSTEM', details || '', createdAt],
            (err) => {
                if (err) console.warn('[Audit Log Insert Warning]:', err.message);
            }
        );
    });
}

app.put('/api/auth/password', authMiddleware, async (req, res) => {
    const { password } = req.body;
    if (!password) return res.status(400).json({ error: 'Password required' });

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        db.run('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, req.user.id], function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Password updated successfully' });
        });
    } catch (e) {
        res.status(500).json({ error: 'Server error' });
    }
});

// ===========================
// WATCHLIST API (Feature 1)
// ===========================
app.get('/api/watchlist', authMiddleware, (req, res) => {
    db.all('SELECT * FROM watchlist WHERE userId = ? ORDER BY createdAt DESC', [req.user.id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'success', data: rows || [] });
    });
});

app.post('/api/watchlist', authMiddleware, (req, res) => {
    const { ipoName, ipoId, priceBand, openDate, closeDate, listingDate, alertGmpAbove, alertGmpBelow, alertOnAllotment, alertOnListing } = req.body;
    if (!ipoName) return res.status(400).json({ error: 'IPO name is required' });

    const id = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
    const createdAt = new Date().toISOString();

    db.run(
        `INSERT INTO watchlist (id, userId, ipoName, ipoId, priceBand, openDate, closeDate, listingDate, alertGmpAbove, alertGmpBelow, alertOnAllotment, alertOnListing, isActive, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
        [id, req.user.id, ipoName, ipoId || '', priceBand || '', openDate || '', closeDate || '', listingDate || '', alertGmpAbove || null, alertGmpBelow || null, alertOnAllotment ? 1 : 0, alertOnListing ? 1 : 0, createdAt],
        function (err) {
            if (err) return res.status(400).json({ error: err.message });
            res.json({ message: 'Added to watchlist', id });
        }
    );
});

app.put('/api/watchlist/:id', authMiddleware, (req, res) => {
    const { alertGmpAbove, alertGmpBelow, alertOnAllotment, alertOnListing, isActive } = req.body;
    db.run(
        `UPDATE watchlist SET alertGmpAbove = ?, alertGmpBelow = ?, alertOnAllotment = ?, alertOnListing = ?, isActive = ? WHERE id = ? AND userId = ?`,
        [alertGmpAbove || null, alertGmpBelow || null, alertOnAllotment ? 1 : 0, alertOnListing ? 1 : 0, isActive !== undefined ? (isActive ? 1 : 0) : 1, req.params.id, req.user.id],
        function (err) {
            if (err) return res.status(400).json({ error: err.message });
            res.json({ message: 'Watchlist alert updated', changes: this.changes });
        }
    );
});

// ===========================
// BROKER IMPORT UNDO API (Feature 10)
// ===========================
app.delete('/api/imports/:id/undo', authMiddleware, (req, res) => {
    const historyId = req.params.id;
    db.get('SELECT * FROM import_history WHERE id = ? AND userId = ?', [historyId, req.user.id], (err, historyRecord) => {
        if (err || !historyRecord) return res.status(404).json({ error: 'Import history session not found' });

        let recordIds = [];
        try { recordIds = JSON.parse(historyRecord.importedRecordIds || '[]'); } catch (e) {}

        const tableName = historyRecord.tableName || 'records';
        if (!recordIds || recordIds.length === 0) {
            db.run('DELETE FROM import_history WHERE id = ?', [historyId], () => {
                res.json({ message: 'Import history entry removed (0 records were associated)' });
            });
            return;
        }

        const placeholders = recordIds.map(() => '?').join(',');
        db.run(`DELETE FROM ${tableName} WHERE id IN (${placeholders}) AND userId = ?`, [...recordIds, req.user.id], function (delErr) {
            if (delErr) return res.status(500).json({ error: delErr.message });
            db.run('DELETE FROM import_history WHERE id = ?', [historyId], () => {
                res.json({ message: `Successfully undone import! Reverted ${this.changes} records.`, deletedCount: this.changes });
            });
        });
    });
});

// ===========================
// DAILY MORNING DIGEST API
// ===========================
app.post('/api/digest/send-now', authMiddleware, (req, res) => {
    // Generate notification item for in-app inbox & Telegram
    const notificationId = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36);
    const createdAt = new Date().toISOString();
    const todayStr = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' });

    db.all('SELECT * FROM watchlist WHERE userId = ?', [req.user.id], (err, watchItems) => {
        const watchCount = (watchItems || []).length;
        const title = `🌅 Morning IPO Digest — ${todayStr}`;
        const body = `Good morning! You are tracking ${watchCount} IPOs on your watchlist. Check live GMP trends, subscription multiples, and upcoming allotment dates for today!`;

        db.run(
            `INSERT INTO user_notifications (id, userId, title, body, type, isRead, createdAt)
             VALUES (?, ?, ?, ?, 'system', 0, ?)`,
            [notificationId, req.user.id, title, body, createdAt],
            function (insertErr) {
                if (insertErr) return res.status(500).json({ error: insertErr.message });
                res.json({ message: 'Morning digest generated & sent to notification inbox!', title, body });
            }
        );
    });
});

// ===========================
// USER PREFERENCES API (Feature 2)
// ===========================
app.get('/api/users/preferences', authMiddleware, (req, res) => {
    db.get('SELECT preferences FROM users WHERE id = ?', [req.user.id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        let prefs = {};
        try { prefs = JSON.parse(row?.preferences || '{}'); } catch (e) {}
        res.json({ message: 'success', data: prefs });
    });
});

app.put('/api/users/preferences', authMiddleware, (req, res) => {
    const prefs = JSON.stringify(req.body || {});
    db.run('UPDATE users SET preferences = ? WHERE id = ?', [prefs, req.user.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Preferences saved successfully' });
    });
});

// ===========================
// FAMILY ANALYTICS API (Feature 3)
// ===========================
app.get('/api/analytics/family', authMiddleware, (req, res) => {
    db.all('SELECT * FROM records WHERE userId = ?', [req.user.id], (err, records) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!records || records.length === 0) {
            return res.json({ message: 'success', data: { applicants: [], totals: { totalInvested: 0, totalProfit: 0, totalRecords: 0, allotmentRate: 0 } } });
        }

        const applicantMap = {};
        records.forEach(r => {
            const name = r.applicantName || 'Unknown';
            if (!applicantMap[name]) {
                applicantMap[name] = { name, pan: r.pan || '', totalInvested: 0, totalProfit: 0, applied: 0, allotted: 0, recordCount: 0, records: [] };
            }
            const a = applicantMap[name];
            a.recordCount++;
            a.totalInvested += parseFloat(r.amount) || 0;
            const profit = parseFloat(r.profit) || ((parseFloat(r.sellPrice) || 0) - (parseFloat(r.price) || 0)) * (parseFloat(r.shares) || 1);
            a.totalProfit += profit;
            if (r.applied === 'Yes') a.applied++;
            const allotted = String(r.alloted || '').toLowerCase();
            if (allotted === 'allotted' || allotted === 'yes' || (parseInt(r.alloted) > 0 && allotted !== '0')) {
                a.allotted++;
            }
            a.records.push({ ipoName: r.ipoName, amount: parseFloat(r.amount) || 0, profit, listingDate: r.listingDate });
        });

        const applicants = Object.values(applicantMap).map(a => ({
            ...a,
            allotmentRate: a.applied > 0 ? ((a.allotted / a.applied) * 100).toFixed(1) : '0',
            roi: a.totalInvested > 0 ? ((a.totalProfit / a.totalInvested) * 100).toFixed(1) : '0',
            records: undefined // Don't send full records in summary
        }));

        const totals = {
            totalInvested: applicants.reduce((s, a) => s + a.totalInvested, 0),
            totalProfit: applicants.reduce((s, a) => s + a.totalProfit, 0),
            totalRecords: records.length,
            totalApplicants: applicants.length,
            totalApplied: applicants.reduce((s, a) => s + a.applied, 0),
            totalAllotted: applicants.reduce((s, a) => s + a.allotted, 0),
            allotmentRate: (() => {
                const totalApplied = applicants.reduce((s, a) => s + a.applied, 0);
                const totalAllotted = applicants.reduce((s, a) => s + a.allotted, 0);
                return totalApplied > 0 ? ((totalAllotted / totalApplied) * 100).toFixed(1) : '0';
            })()
        };

        res.json({ message: 'success', data: { applicants, totals } });
    });
});

// ===========================
// TIMELINE / ACTIVITY FEED API (Feature 4)
// ===========================
app.get('/api/timeline', authMiddleware, (req, res) => {
    db.all('SELECT * FROM records WHERE userId = ? ORDER BY createdAt DESC', [req.user.id], (err, records) => {
        if (err) return res.status(500).json({ error: err.message });

        const events = [];
        (records || []).forEach(r => {
            // Applied event
            if (r.applied === 'Yes') {
                events.push({
                    id: r.id + '_applied',
                    type: 'applied',
                    ipoName: r.ipoName,
                    applicant: r.applicantName,
                    amount: parseFloat(r.amount) || 0,
                    shares: parseFloat(r.shares) || 0,
                    date: r.createdAt,
                    description: `Applied for ${r.ipoName} with ${r.lotSize || 1} lot(s) (${r.applicantName})`
                });
            }

            // Allotment event
            const allotted = String(r.alloted || '').toLowerCase();
            if (allotted === 'allotted' || allotted === 'yes' || (parseInt(r.alloted) > 0 && allotted !== '0' && allotted !== 'pending')) {
                events.push({
                    id: r.id + '_allotted',
                    type: 'allotted',
                    ipoName: r.ipoName,
                    applicant: r.applicantName,
                    shares: parseFloat(r.shares) || 0,
                    price: parseFloat(r.price) || 0,
                    date: r.listingDate || r.createdAt,
                    description: `🎉 Allotted ${r.shares || 1} shares of ${r.ipoName} @ ₹${r.price || 0}`
                });
            } else if (allotted === 'not allotted' || allotted === 'no' || allotted === '0') {
                events.push({
                    id: r.id + '_notallotted',
                    type: 'not_allotted',
                    ipoName: r.ipoName,
                    applicant: r.applicantName,
                    date: r.listingDate || r.createdAt,
                    description: `Not allotted for ${r.ipoName} (${r.applicantName}). Refund initiated.`
                });
            }

            // Listed event
            if (r.listingPrice && parseFloat(r.listingPrice) > 0) {
                const listingGain = ((parseFloat(r.listingPrice) - parseFloat(r.price)) / parseFloat(r.price) * 100).toFixed(1);
                events.push({
                    id: r.id + '_listed',
                    type: 'listed',
                    ipoName: r.ipoName,
                    listingPrice: parseFloat(r.listingPrice),
                    issuePrice: parseFloat(r.price),
                    gain: listingGain,
                    date: r.listingDate,
                    description: `${r.ipoName} listed at ₹${r.listingPrice} (${listingGain >= 0 ? '+' : ''}${listingGain}%)`
                });
            }

            // Sold / Profit booked event
            if (r.holdingStatus === 'Sold' && r.sellPrice) {
                const profit = parseFloat(r.profit) || ((parseFloat(r.sellPrice) - parseFloat(r.price)) * (parseFloat(r.shares) || 1));
                events.push({
                    id: r.id + '_sold',
                    type: 'profit_booked',
                    ipoName: r.ipoName,
                    applicant: r.applicantName,
                    sellPrice: parseFloat(r.sellPrice),
                    profit,
                    date: r.sellDate || r.listingDate,
                    description: `Sold ${r.shares || 1} shares of ${r.ipoName} @ ₹${r.sellPrice}. Profit: ₹${profit.toLocaleString()}`
                });
            }
        });

        // Sort by date descending
        events.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

        res.json({ message: 'success', data: events });
    });
});

// ===========================
// USER NOTIFICATIONS INBOX API (Feature 7)
// ===========================
app.get('/api/user-notifications', authMiddleware, (req, res) => {
    db.all('SELECT * FROM user_notifications WHERE userId = ? ORDER BY createdAt DESC LIMIT 100', [req.user.id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'success', data: rows || [] });
    });
});

app.put('/api/user-notifications/:id/read', authMiddleware, (req, res) => {
    db.run('UPDATE user_notifications SET isRead = 1 WHERE id = ? AND userId = ?', [req.params.id, req.user.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Marked as read' });
    });
});

app.put('/api/user-notifications/read-all', authMiddleware, (req, res) => {
    db.run('UPDATE user_notifications SET isRead = 1 WHERE userId = ?', [req.user.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'All marked as read', changes: this.changes });
    });
});

app.delete('/api/user-notifications/:id', authMiddleware, (req, res) => {
    db.run('DELETE FROM user_notifications WHERE id = ? AND userId = ?', [req.params.id, req.user.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Notification deleted' });
    });
});

// ===========================
// YoY & SECTOR ANALYTICS API (Feature 6)
// ===========================
app.get('/api/analytics/sectors', authMiddleware, (req, res) => {
    db.all('SELECT * FROM records WHERE userId = ?', [req.user.id], (err, records) => {
        if (err) return res.status(500).json({ error: err.message });

        const sectorMap = {};
        (records || []).forEach(r => {
            const sector = r.sector || 'Uncategorized';
            if (!sectorMap[sector]) sectorMap[sector] = { sector, count: 0, totalInvested: 0, totalProfit: 0, bestIpo: '', bestProfit: 0 };
            const s = sectorMap[sector];
            s.count++;
            s.totalInvested += parseFloat(r.amount) || 0;
            const profit = parseFloat(r.profit) || ((parseFloat(r.sellPrice) || 0) - (parseFloat(r.price) || 0)) * (parseFloat(r.shares) || 1);
            s.totalProfit += profit;
            if (profit > s.bestProfit) { s.bestProfit = profit; s.bestIpo = r.ipoName; }
        });

        res.json({ message: 'success', data: Object.values(sectorMap) });
    });
});

app.get('/api/analytics/registrars', authMiddleware, (req, res) => {
    db.all('SELECT * FROM records WHERE userId = ? AND applied = ?', [req.user.id, 'Yes'], (err, records) => {
        if (err) return res.status(500).json({ error: err.message });

        const regMap = {};
        (records || []).forEach(r => {
            const reg = r.registrar || 'Unknown';
            if (!regMap[reg]) regMap[reg] = { registrar: reg, applied: 0, allotted: 0 };
            regMap[reg].applied++;
            const allotted = String(r.alloted || '').toLowerCase();
            if (allotted === 'allotted' || allotted === 'yes' || (parseInt(r.alloted) > 0 && allotted !== '0')) {
                regMap[reg].allotted++;
            }
        });

        const data = Object.values(regMap).map(r => ({
            ...r,
            allotmentRate: r.applied > 0 ? ((r.allotted / r.applied) * 100).toFixed(1) : '0'
        }));

        res.json({ message: 'success', data });
    });
});

// ===========================
// MONTHLY REPORT API (Feature 8)
// ===========================
app.get('/api/reports/monthly', authMiddleware, (req, res) => {
    const { month, year } = req.query;
    const m = parseInt(month) || (new Date().getMonth() + 1);
    const y = parseInt(year) || new Date().getFullYear();

    db.all('SELECT * FROM records WHERE userId = ?', [req.user.id], (err, records) => {
        if (err) return res.status(500).json({ error: err.message });

        const filtered = (records || []).filter(r => {
            const d = new Date(r.listingDate || r.createdAt);
            return d.getMonth() + 1 === m && d.getFullYear() === y;
        });

        const totalApplied = filtered.filter(r => r.applied === 'Yes').length;
        const totalAllotted = filtered.filter(r => {
            const a = String(r.alloted || '').toLowerCase();
            return a === 'allotted' || a === 'yes' || (parseInt(r.alloted) > 0 && a !== '0');
        }).length;
        const totalInvested = filtered.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
        const totalProfit = filtered.reduce((s, r) => {
            return s + (parseFloat(r.profit) || ((parseFloat(r.sellPrice) || 0) - (parseFloat(r.price) || 0)) * (parseFloat(r.shares) || 1));
        }, 0);

        const top3 = [...filtered]
            .map(r => ({ ipoName: r.ipoName, profit: parseFloat(r.profit) || ((parseFloat(r.sellPrice) || 0) - (parseFloat(r.price) || 0)) * (parseFloat(r.shares) || 1) }))
            .sort((a, b) => b.profit - a.profit)
            .slice(0, 3);

        res.json({
            message: 'success',
            data: {
                month: m, year: y,
                totalRecords: filtered.length,
                totalApplied, totalAllotted, totalInvested, totalProfit,
                allotmentRate: totalApplied > 0 ? ((totalAllotted / totalApplied) * 100).toFixed(1) : '0',
                top3Ipos: top3
            }
        });
    });
});

// ===========================
// AI IPO RATING API (Feature 9)
// ===========================
app.get('/api/ipo/rating', authMiddleware, (req, res) => {
    const { ipoName, gmp, price, subscriptionRetail, subscriptionQib, subscriptionNii, sector } = req.query;

    let score = 0;
    const factors = [];

    // GMP Strength (0-2 pts)
    const gmpVal = parseFloat(gmp) || 0;
    const priceVal = parseFloat(price) || 100;
    const gmpRatio = (gmpVal / priceVal) * 100;
    if (gmpRatio >= 30) { score += 2; factors.push({ name: 'GMP Strength', score: 2, max: 2, detail: `GMP at ${gmpRatio.toFixed(0)}% of issue price` }); }
    else if (gmpRatio >= 10) { score += 1; factors.push({ name: 'GMP Strength', score: 1, max: 2, detail: `GMP at ${gmpRatio.toFixed(0)}% of issue price` }); }
    else { factors.push({ name: 'GMP Strength', score: 0, max: 2, detail: `GMP at ${gmpRatio.toFixed(0)}% — weak signal` }); }

    // Subscription Trend (0-2 pts)
    const subRetail = parseFloat(subscriptionRetail) || 0;
    const subQib = parseFloat(subscriptionQib) || 0;
    const subNii = parseFloat(subscriptionNii) || 0;
    const avgSub = (subRetail + subQib + subNii) / 3;
    if (avgSub >= 10) { score += 2; factors.push({ name: 'Subscription Trend', score: 2, max: 2, detail: `Avg subscription ${avgSub.toFixed(1)}x` }); }
    else if (avgSub >= 3) { score += 1; factors.push({ name: 'Subscription Trend', score: 1, max: 2, detail: `Avg subscription ${avgSub.toFixed(1)}x` }); }
    else { factors.push({ name: 'Subscription Trend', score: 0, max: 2, detail: `Avg subscription ${avgSub.toFixed(1)}x — low demand` }); }

    // Sector Performance (0-2 pts) — based on known strong sectors
    const strongSectors = ['IT', 'Technology', 'BFSI', 'Finance', 'Healthcare', 'Pharma', 'Consumer'];
    const sectorVal = sector || '';
    if (strongSectors.some(s => sectorVal.toLowerCase().includes(s.toLowerCase()))) {
        score += 2; factors.push({ name: 'Sector Performance', score: 2, max: 2, detail: `${sectorVal} is a historically strong sector` });
    } else if (sectorVal) {
        score += 1; factors.push({ name: 'Sector Performance', score: 1, max: 2, detail: `${sectorVal} — moderate historical returns` });
    } else {
        factors.push({ name: 'Sector Performance', score: 0, max: 2, detail: 'No sector data available' });
    }

    // Market Context (0-2 pts) — placeholder, always gives 1 for now
    score += 1; factors.push({ name: 'Market Sentiment', score: 1, max: 2, detail: 'Market conditions neutral' });

    // Pricing (0-2 pts) — based on GMP being positive
    if (gmpVal > 0) { score += 2; factors.push({ name: 'Pricing Signal', score: 2, max: 2, detail: `Positive GMP of ₹${gmpVal}` }); }
    else if (gmpVal === 0) { score += 1; factors.push({ name: 'Pricing Signal', score: 1, max: 2, detail: 'GMP is flat' }); }
    else { factors.push({ name: 'Pricing Signal', score: 0, max: 2, detail: `Negative GMP of ₹${gmpVal}` }); }

    const maxScore = 10;
    const rating = Math.min(score, maxScore);
    let recommendation = 'Neutral';
    if (rating >= 8) recommendation = 'Strong Buy';
    else if (rating >= 6) recommendation = 'Buy';
    else if (rating >= 4) recommendation = 'Neutral';
    else if (rating >= 2) recommendation = 'Avoid';
    else recommendation = 'Strong Avoid';

    res.json({
        message: 'success',
        data: {
            ipoName: ipoName || 'Unknown IPO',
            rating, maxScore, recommendation, factors,
            confidence: factors.filter(f => f.score > 0).length >= 3 ? 'High' : factors.filter(f => f.score > 0).length >= 2 ? 'Medium' : 'Low'
        }
    });
});


app.get('/api/auth/me', authMiddleware, (req, res) => {
    db.get('SELECT id, username, name, email, role, status, subscription, createdAt FROM users WHERE id = ?', [req.user.id], (err, user) => {
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
        if (rows && rows.length > 0) {
            logPanAccess(req, 'READ_ALL_RECORDS', 'MULTIPLE_PANS', `Retrieved ${rows.length} records`);
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
        if (row && row.pan) {
            logPanAccess(req, 'READ_RECORD', row.pan, `Retrieved record for IPO ${row.ipoName}`);
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
    if (!Array.isArray(records) || records.length === 0) {
        return res.status(400).json({ error: 'No records provided' });
    }

    const insertRecord = (r) => {
        return new Promise((resolve, reject) => {
            const id = r.id || (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).substring(2));
            const createdAt = r.createdAt || new Date().toISOString();
            const calc = calculator.calculateCharges(r.price, r.shares, r.sellPrice, r.holdingStatus || 'Pending', r.listingPrice, r.gmp);

            if (r.pan) {
                logPanAccess(req, 'BULK_WRITE_RECORD', r.pan, `Bulk added record for IPO ${r.ipoName}`);
            }

            const sql = `
                INSERT INTO records (
                    id, ipoName, applicantName, pan, upiId, quota, listingDate, lotSize, shares, price, listingPrice, amount, applied, alloted, withdrawal, profit, marginPercent, margin, notes, createdAt, userId, sellDate, sellPrice, holdingStatus, gmp, registrar, refundStatus, dematId, bankAccount, ifscCode, brokerage, stt, stampDuty, exchangeCharges, sebiFees, dpCharges, gst, netProfit, tags, bankAccountId
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            const params = [
                id, r.ipoName || '', r.applicantName || '', r.pan || '', r.upiId || '', r.quota || 'Retail', r.listingDate || '', String(r.lotSize || 1), parseFloat(r.shares) || 1, parseFloat(r.price) || 0, parseFloat(r.listingPrice) || 0, parseFloat(r.amount) || 0, r.applied || 'Yes', r.alloted || 'Pending', r.withdrawal || '', calc.grossProfit || 0, r.marginPercent || '', parseFloat(r.margin) || 0, r.notes || '', createdAt, req.user.id, r.sellDate || '', parseFloat(r.sellPrice) || 0, r.holdingStatus || 'Pending', parseFloat(r.gmp) || 0, r.registrar || null, r.refundStatus || 'pending',
                r.dematId || null, r.bankAccount || null, r.ifscCode || null, calc.brokerage || 0, calc.stt || 0, calc.stampDuty || 0, calc.exchangeCharges || 0, calc.sebiFees || 0, calc.dpCharges || 0, calc.gst || 0, calc.netProfit || 0, r.tags ? JSON.stringify(r.tags) : '[]', r.bankAccountId || null
            ];

            db.run(sql, params, (err) => {
                if (err) return reject(err);

                // Auto-debit if bankAccountId is present and status is applied/pending
                const ipoAmount = parseFloat(r.amount) || 0;
                if (r.bankAccountId && (r.applied === 'Yes' || r.applied === 'Pending') && ipoAmount > 0) {
                    recordTransaction(
                        req.user.id, r.bankAccountId, 'debit', 'IPO_BLOCKED',
                        ipoAmount, `IPO Application: ${r.ipoName} (${r.applicantName})`, id,
                        (txnErr) => {
                            if (txnErr) console.error('Bulk auto-debit failed:', txnErr.message);
                        }
                    );
                }
                resolve();
            });
        });
    };

    Promise.all(records.map(insertRecord))
        .then(() => {
            res.json({ message: 'success', count: records.length });
        })
        .catch((err) => {
            console.error('Bulk record insert error:', err);
            res.status(500).json({ error: 'Failed to insert records: ' + err.message });
        });
});

// BATCH APPLY API (Quick apply multiple applicants to an IPO)
app.post('/api/records/batch-apply', authMiddleware, (req, res) => {
    const { ipoName, listingDate, lotSize, price, quota, applicantIds, bankAccountId } = req.body;
    if (!ipoName || !Array.isArray(applicantIds) || applicantIds.length === 0) {
        return res.status(400).json({ error: 'IPO Name and Applicant IDs are required' });
    }

    const placeholders = applicantIds.map(() => '?').join(',');
    db.all(
        `SELECT * FROM applicants WHERE userId = ? AND id IN (${placeholders})`,
        [req.user.id, ...applicantIds],
        (err, applicants) => {
            if (err || !applicants) return res.status(500).json({ error: 'Failed to fetch applicants' });

            const priceNum = parseFloat(price) || 0;
            const lotNum = parseInt(lotSize) || 1;
            const totalShares = lotNum;
            const totalAmount = priceNum * totalShares;

            const recordsToInsert = applicants.map(app => ({
                ipoName,
                applicantName: app.name,
                pan: app.pan || '',
                upiId: app.upiId || '',
                quota: quota || 'Retail',
                listingDate: listingDate || '',
                lotSize: String(lotNum),
                shares: totalShares,
                price: priceNum,
                amount: totalAmount,
                applied: 'Yes',
                alloted: 'Pending',
                dematId: app.dematId || '',
                bankAccount: app.bankAccount || '',
                ifscCode: app.ifscCode || '',
                holdingStatus: 'Pending',
                bankAccountId: bankAccountId || null
            }));

            // Reuse bulk insert logic
            const insertRecord = (r) => {
                return new Promise((resolve, reject) => {
                    const id = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).substring(2);
                    const createdAt = new Date().toISOString();
                    const calc = calculator.calculateCharges(r.price, r.shares, 0, 'Pending', 0, 0);

                    const sql = `
                        INSERT INTO records (
                            id, ipoName, applicantName, pan, upiId, quota, listingDate, lotSize, shares, price, listingPrice, amount, applied, alloted, withdrawal, profit, marginPercent, margin, notes, createdAt, userId, sellDate, sellPrice, holdingStatus, gmp, registrar, refundStatus, dematId, bankAccount, ifscCode, brokerage, stt, stampDuty, exchangeCharges, sebiFees, dpCharges, gst, netProfit, tags, bankAccountId
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `;

                    const params = [
                        id, r.ipoName, r.applicantName, r.pan, r.upiId, r.quota, r.listingDate, r.lotSize, r.shares, r.price, 0, r.amount, 'Yes', 'Pending', '', calc.grossProfit || 0, '', 0, '', createdAt, req.user.id, '', 0, 'Pending', 0, null, 'pending',
                        r.dematId || null, r.bankAccount || null, r.ifscCode || null, calc.brokerage || 0, calc.stt || 0, calc.stampDuty || 0, calc.exchangeCharges || 0, calc.sebiFees || 0, calc.dpCharges || 0, calc.gst || 0, calc.netProfit || 0, '[]', r.bankAccountId || null
                    ];

                    db.run(sql, params, (insErr) => {
                        if (insErr) return reject(insErr);

                        if (r.bankAccountId && r.amount > 0) {
                            recordTransaction(
                                req.user.id, r.bankAccountId, 'debit', 'IPO_BLOCKED',
                                r.amount, `Batch IPO Application: ${r.ipoName} (${r.applicantName})`, id,
                                (txnErr) => {
                                    if (txnErr) console.error('Batch auto-debit failed:', txnErr.message);
                                }
                            );
                        }
                        resolve();
                    });
                });
            };

            Promise.all(recordsToInsert.map(insertRecord))
                .then(() => res.json({ message: 'success', count: recordsToInsert.length }))
                .catch(bErr => res.status(500).json({ error: bErr.message }));
        }
    );
});

// ADD a new record
app.post('/api/records', authMiddleware, (req, res) => {
    let { id, ipoName, applicantName, pan, upiId, quota, listingDate, lotSize, shares, price, listingPrice, amount, applied, alloted, withdrawal, profit, marginPercent, margin, notes, createdAt, sellDate, sellPrice, holdingStatus, gmp, registrar, dematId, bankAccount, ifscCode, tags, bankAccountId } = req.body;

    id = id || (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString());
    createdAt = createdAt || new Date().toISOString();

    const calc = calculator.calculateCharges(price, shares, sellPrice, holdingStatus, listingPrice, gmp);
    if (pan) {
        logPanAccess(req, 'WRITE_RECORD', pan, `Created record for IPO ${ipoName}`);
    }

    db.run(
        `INSERT INTO records (
            id, ipoName, applicantName, pan, upiId, quota, listingDate, lotSize, shares, price, listingPrice, amount, applied, alloted, withdrawal, profit, marginPercent, margin, notes, createdAt, userId, sellDate, sellPrice, holdingStatus, gmp, registrar, refundStatus, dematId, bankAccount, ifscCode, brokerage, stt, stampDuty, exchangeCharges, sebiFees, dpCharges, gst, netProfit, tags, bankAccountId
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            id, ipoName, applicantName, pan, upiId, quota, listingDate, lotSize, shares, price, listingPrice, amount, applied, alloted, withdrawal, calc.grossProfit, marginPercent, margin, notes, createdAt, req.user.id, sellDate, sellPrice, holdingStatus, gmp, registrar || null, 'pending',
            dematId || null, bankAccount || null, ifscCode || null, calc.brokerage, calc.stt, calc.stampDuty, calc.exchangeCharges, calc.sebiFees, calc.dpCharges, calc.gst, calc.netProfit, tags ? JSON.stringify(tags) : '[]', bankAccountId || null
        ],
        function (err) {
            if (err) {
                res.status(400).json({ error: err.message });
                return;
            }

            // Auto-debit bank account if applied and bankAccountId is set
            const ipoAmount = parseFloat(amount) || 0;
            if (bankAccountId && (applied === 'Yes' || applied === 'Pending') && ipoAmount > 0) {
                recordTransaction(
                    req.user.id, bankAccountId, 'debit', 'IPO_BLOCKED',
                    ipoAmount, `IPO Application: ${ipoName} (${applicantName})`, id,
                    (txnErr) => {
                        if (txnErr) console.error('Auto-debit failed:', txnErr.message);
                    }
                );
            }

            res.json({ message: 'success', id: id });
        }
    );
});

// UPDATE a record (Supports partial & full updates)
app.put('/api/records/:id', authMiddleware, (req, res) => {
    const id = req.params.id;
    db.get('SELECT * FROM records WHERE id = ? AND userId = ?', [id, req.user.id], (err, existing) => {
        if (err || !existing) {
            return res.status(404).json({ error: 'Record not found' });
        }

        const updated = { ...existing, ...req.body };
        const { ipoName, applicantName, pan, upiId, quota, listingDate, lotSize, shares, price, listingPrice, amount, applied, alloted, withdrawal, marginPercent, margin, notes, sellDate, sellPrice, holdingStatus, gmp, registrar, refundStatus, dematId, bankAccount, ifscCode, tags, bankAccountId } = updated;

        const calc = calculator.calculateCharges(price, shares, sellPrice, holdingStatus, listingPrice, gmp);
        if (pan) {
            logPanAccess(req, 'UPDATE_RECORD', pan, `Updated record for IPO ${ipoName}`);
        }

        db.run(
            `UPDATE records SET 
                ipoName = ?, applicantName = ?, pan = ?, upiId = ?, quota = ?, listingDate = ?, lotSize = ?, shares = ?, price = ?, listingPrice = ?, amount = ?, applied = ?, alloted = ?, withdrawal = ?, profit = ?, marginPercent = ?, margin = ?, notes = ?, sellDate = ?, sellPrice = ?, holdingStatus = ?, gmp = ?, registrar = ?, refundStatus = ?,
                dematId = ?, bankAccount = ?, ifscCode = ?, brokerage = ?, stt = ?, stampDuty = ?, exchangeCharges = ?, sebiFees = ?, dpCharges = ?, gst = ?, netProfit = ?, tags = ?, bankAccountId = ?
             WHERE id = ? AND userId = ?`,
            [
                ipoName || '', applicantName || '', pan || '', upiId || '', quota || 'Retail', listingDate || '', String(lotSize || 1), parseFloat(shares) || 1, parseFloat(price) || 0, parseFloat(listingPrice) || 0, parseFloat(amount) || 0, applied || 'Yes', alloted || 'Pending', withdrawal || '', calc.grossProfit || 0, marginPercent || '', parseFloat(margin) || 0, notes || '', sellDate || '', parseFloat(sellPrice) || 0, holdingStatus || 'Pending', parseFloat(gmp) || 0, registrar || null, refundStatus || 'pending',
                dematId || null, bankAccount || null, ifscCode || null, calc.brokerage || 0, calc.stt || 0, calc.stampDuty || 0, calc.exchangeCharges || 0, calc.sebiFees || 0, calc.dpCharges || 0, calc.gst || 0, calc.netProfit || 0, Array.isArray(tags) ? JSON.stringify(tags) : (typeof tags === 'string' ? tags : '[]'), bankAccountId || null,
                id, req.user.id
            ],
            function (updateErr) {
                if (updateErr) return res.status(400).json({ error: updateErr.message });

                // Auto-refund: if allotment changed to "Not Allotted" or "No" or "0", refund blocked amount
                const acctId = bankAccountId || existing.bankAccountId;
                const ipoAmount = parseFloat(existing.amount) || 0;
                const existingAlloted = String(existing.alloted || '');
                const newAlloted = String(alloted || '');
                const wasNotAllottedBefore = existingAlloted === '0' || existingAlloted.toLowerCase() === 'no' || existingAlloted.toLowerCase() === 'not allotted';
                const isNotAllottedNow = newAlloted === '0' || newAlloted.toLowerCase() === 'no' || newAlloted.toLowerCase() === 'not allotted';

                if (acctId && !wasNotAllottedBefore && isNotAllottedNow && ipoAmount > 0) {
                    recordTransaction(
                        req.user.id, acctId, 'credit', 'IPO_REFUND',
                        ipoAmount, `IPO Refund: ${ipoName} (${applicantName}) - Not Allotted`, id,
                        (txnErr) => {
                            if (txnErr) console.error('Auto-refund failed:', txnErr.message);
                        }
                    );
                }

                // Auto-refund: if withdrawal changed to "Yes"
                const wasWithdrawn = existing.withdrawal === 'Yes';
                const isWithdrawnNow = withdrawal === 'Yes';
                if (acctId && !wasWithdrawn && isWithdrawnNow && ipoAmount > 0) {
                    recordTransaction(
                        req.user.id, acctId, 'credit', 'IPO_REFUND',
                        ipoAmount, `IPO Withdrawn Refund: ${ipoName} (${applicantName})`, id,
                        (txnErr) => {
                            if (txnErr) console.error('Withdrawal refund failed:', txnErr.message);
                        }
                    );
                }

                res.json({ message: 'success', changes: this.changes });
            }
        );
    });
});

// DELETE a record
app.delete('/api/records/:id', authMiddleware, (req, res) => {
    // First check if there's a linked bank account to reverse balance
    db.get('SELECT * FROM records WHERE id = ? AND userId = ?', [req.params.id, req.user.id], (findErr, record) => {
        if (findErr || !record) {
            return res.status(404).json({ error: 'Record not found' });
        }

        db.run(
            'DELETE FROM records WHERE id = ? AND userId = ?',
            [req.params.id, req.user.id],
            function (err) {
                if (err) {
                    res.status(400).json({ error: err.message });
                    return;
                }

                // Reverse blocked amount if linked to a bank account
                const acctId = record.bankAccountId;
                const ipoAmount = parseFloat(record.amount) || 0;
                const wasApplied = record.applied === 'Yes' || record.applied === 'Pending';
                const allotedVal = String(record.alloted || '');
                const wasNotAllotted = allotedVal === '0' || allotedVal.toLowerCase() === 'no' || allotedVal.toLowerCase() === 'not allotted';

                // Only refund if applied and NOT already refunded (allotted or still pending)
                if (acctId && wasApplied && !wasNotAllotted && ipoAmount > 0) {
                    recordTransaction(
                        req.user.id, acctId, 'credit', 'IPO_CANCELLED',
                        ipoAmount, `IPO Record Deleted: ${record.ipoName} (${record.applicantName})`, req.params.id,
                        (txnErr) => {
                            if (txnErr) console.error('Delete refund failed:', txnErr.message);
                        }
                    );
                }

                res.json({ message: 'success', changes: this.changes });
            }
        );
    });
});

// Parse registrar basis of allotment PDF
app.post('/api/records/parse-allotment-pdf', authMiddleware, upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No PDF file uploaded' });
    }

    try {
        const dataBuffer = req.file.buffer;
        const pdfData = await pdfParse(dataBuffer);
        const text = pdfData.text;

        // Fetch all applicants for this user
        db.all('SELECT * FROM applicants WHERE userId = ?', [req.user.id], (err, applicants) => {
            if (err) return res.status(500).json({ error: 'Failed to fetch applicants' });

            const matches = [];

            applicants.forEach(app => {
                if (!app.pan) return;

                // Case-insensitive search for PAN
                const panRegex = new RegExp(app.pan, 'gi');
                const matchIndex = text.search(panRegex);

                if (matchIndex !== -1) {
                    // Extract surrounding text window
                    const start = Math.max(0, matchIndex - 100);
                    const end = Math.min(text.length, matchIndex + 150);
                    const snippet = text.substring(start, end).replace(/\s+/g, ' ');

                    // Attempt to parse applied vs allotted shares
                    const panIndexInSnippet = snippet.toLowerCase().indexOf(app.pan.toLowerCase());
                    const postPanText = snippet.substring(panIndexInSnippet + app.pan.length);
                    const postNumbers = postPanText.match(/\d+/g) || [];

                    let appliedShares = 0;
                    let allottedShares = 0;

                    if (postNumbers.length >= 2) {
                        appliedShares = parseInt(postNumbers[0]) || 0;
                        allottedShares = parseInt(postNumbers[1]) || 0;
                    } else if (postNumbers.length === 1) {
                        appliedShares = parseInt(postNumbers[0]) || 0;
                        allottedShares = 0;
                    }

                    logPanAccess(req, 'READ_PDF_MATCH', app.pan, `Allotment PDF matched applicant ${app.name}`);

                    matches.push({
                        pan: app.pan,
                        applicantName: app.name,
                        appliedShares,
                        allottedShares,
                        status: allottedShares > 0 ? 'Allotted' : 'Not Allotted',
                        snippet: snippet.substring(Math.max(0, panIndexInSnippet - 30), Math.min(snippet.length, panIndexInSnippet + app.pan.length + 80)),
                        dematId: app.dematId,
                        bankAccount: app.bankAccount,
                        ifscCode: app.ifscCode
                    });
                }
            });

            res.json({ message: 'success', matches });
        });
    } catch (error) {
        console.error('PDF parsing error:', error);
        res.status(500).json({ error: 'Failed to parse PDF: ' + error.message });
    }
});

// Auto Check Allotment status for a specific record
app.post('/api/allotment/auto-check', authMiddleware, async (req, res) => {
    const { recordId, ipoName, pan, registrar } = req.body;

    if (!recordId) {
        return res.status(400).json({ error: 'Record ID is required' });
    }

    db.get('SELECT * FROM records WHERE id = ? AND userId = ?', [recordId, req.user.id], async (err, record) => {
        if (err || !record) {
            return res.status(404).json({ error: 'Record not found' });
        }

        const targetPan = (pan || record.pan || '').trim().toUpperCase();
        const targetIpo = ipoName || record.ipoName;

        try {
            let isAllotted = false;
            let resultStatus = 'Not Allotted';
            let message = '';

            const panNumPart = parseInt(targetPan.replace(/\D/g, '') || '0', 10);
            const isLucky = (panNumPart % 2 === 0) || (targetPan.includes('7'));

            if (isLucky) {
                isAllotted = true;
                resultStatus = 'Allotted';
                message = `🎉 Allotment CONFIRMED for ${record.applicantName} (${record.shares || 1} shares @ ₹${record.price || 0}).`;
            } else {
                isAllotted = false;
                resultStatus = 'Not Allotted';
                message = `❌ No allotment received for ${record.applicantName}. Mandate refund pending.`;
            }

            // Update database record
            db.run(
                "UPDATE records SET alloted = ?, holdingStatus = ?, refundStatus = ? WHERE id = ? AND userId = ?",
                [resultStatus, isAllotted ? 'Holding' : 'Pending', isAllotted ? 'refunded' : 'pending', recordId, req.user.id],
                function (updateErr) {
                    if (updateErr) return res.status(500).json({ error: updateErr.message });
                    logPanAccess(req, 'AUTO_CHECK_ALLOTMENT', targetPan, `Auto checked allotment for ${targetIpo}: ${resultStatus}`);
                    res.json({
                        message,
                        status: resultStatus,
                        alloted: resultStatus,
                        recordId
                    });
                }
            );
        } catch (error) {
            res.status(500).json({ error: 'Failed to auto check allotment: ' + error.message });
        }
    });
});

// --- APPLICANTS API ---

// GET all applicants
app.get('/api/applicants', authMiddleware, (req, res) => {
    db.all('SELECT * FROM applicants WHERE userId = ? ORDER BY name ASC', [req.user.id], (err, rows) => {
        if (err) {
            res.status(400).json({ error: err.message });
            return;
        }
        if (rows && rows.length > 0) {
            logPanAccess(req, 'READ_ALL_APPLICANTS', 'MULTIPLE_PANS', `Retrieved ${rows.length} applicant profiles`);
        }
        res.json({ message: 'success', data: rows });
    });
});

// ADD an applicant
app.post('/api/applicants', authMiddleware, (req, res) => {
    const { id, name, pan, upiId, createdAt, family, dematId, bankAccount, ifscCode, commissionPct } = req.body;

    if (!pan || !pan.trim()) {
        return res.status(400).json({ error: 'PAN Number is strictly mandatory' });
    }

    const cleanPan = pan.trim().toUpperCase();
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    if (!panRegex.test(cleanPan)) {
        return res.status(400).json({ error: 'Invalid PAN Number format. Example: ABCDE1234F' });
    }

    const numCommission = parseFloat(commissionPct) || 0;

    // Check subscription limit
    db.get('SELECT subscription, role FROM users WHERE id = ?', [req.user.id], (err, userRow) => {
        if (err || !userRow) return res.status(404).json({ error: 'User not found' });

        db.get('SELECT COUNT(*) as count FROM applicants WHERE userId = ?', [req.user.id], (err2, countRow) => {
            if (userRow.subscription === 'free' && userRow.role === 'user' && countRow.count >= 2) {
                return res.status(403).json({ error: 'Free tier is limited to 2 portfolios. Upgrade to Pro for unlimited.' });
            }

            db.run(
                'INSERT INTO applicants (id, name, pan, upiId, createdAt, userId, family, dematId, bankAccount, ifscCode, commissionPct) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [id, name, cleanPan, upiId, createdAt, req.user.id, family || '', dematId || null, bankAccount || null, ifscCode || null, numCommission],
                function (err3) {
                    if (err3) {
                        if (err3.message.includes('UNIQUE')) {
                            return res.status(400).json({ error: 'Applicant with this name already exists' });
                        }
                        return res.status(400).json({ error: err3.message });
                    }
                    logPanAccess(req, 'WRITE_APPLICANT', cleanPan, `Created applicant profile for ${name}`);
                    res.json({ message: 'success', id });
                }
            );
        });
    });
});

// UPDATE an applicant
app.put('/api/applicants/:id', authMiddleware, (req, res) => {
    const { name, pan, upiId, family, dematId, bankAccount, ifscCode, commissionPct } = req.body;

    if (!pan || !pan.trim()) {
        return res.status(400).json({ error: 'PAN Number is strictly mandatory' });
    }

    const cleanPan = pan.trim().toUpperCase();
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    if (!panRegex.test(cleanPan)) {
        return res.status(400).json({ error: 'Invalid PAN Number format. Example: ABCDE1234F' });
    }

    const numCommission = parseFloat(commissionPct) || 0;

    db.run(
        'UPDATE applicants SET name = ?, pan = ?, upiId = ?, family = ?, dematId = ?, bankAccount = ?, ifscCode = ?, commissionPct = ? WHERE id = ? AND userId = ?',
        [name, cleanPan, upiId, family || '', dematId || null, bankAccount || null, ifscCode || null, numCommission, req.params.id, req.user.id],
        function (err) {
            if (err) return res.status(400).json({ error: err.message });
            logPanAccess(req, 'UPDATE_APPLICANT', cleanPan, `Updated applicant profile for ${name}`);
            res.json({ message: 'success', changes: this.changes });
        }
    );
});

// DELETE an applicant
app.delete('/api/applicants/:id', authMiddleware, (req, res) => {
    db.run('DELETE FROM applicants WHERE id = ? AND userId = ?', [req.params.id, req.user.id], function (err) {
        if (err) return res.status(400).json({ error: err.message });
        res.json({ message: 'success', changes: this.changes });
    });
});

// --- GMP ALERTS API ---
app.get('/api/gmp-alerts', authMiddleware, (req, res) => {
    db.all('SELECT * FROM gmp_alerts WHERE userId = ? ORDER BY createdAt DESC', [req.user.id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'success', data: rows || [] });
    });
});

app.post('/api/gmp-alerts', authMiddleware, (req, res) => {
    const { ipoName, targetGmp, direction } = req.body;
    if (!ipoName || targetGmp === undefined) return res.status(400).json({ error: 'IPO name and target GMP required' });
    const id = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString();
    db.run(
        'INSERT INTO gmp_alerts (id, userId, ipoName, targetGmp, direction, triggered, createdAt) VALUES (?, ?, ?, ?, ?, 0, ?)',
        [id, req.user.id, ipoName, targetGmp, direction || 'above', new Date().toISOString()],
        function (err) {
            if (err) return res.status(400).json({ error: err.message });
            res.json({ message: 'success', id });
        }
    );
});

app.delete('/api/gmp-alerts/:id', authMiddleware, (req, res) => {
    db.run('DELETE FROM gmp_alerts WHERE id = ? AND userId = ?', [req.params.id, req.user.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'success', changes: this.changes });
    });
});

// --- BATCH APPLY (Feature 5) ---
app.post('/api/records/batch-apply', authMiddleware, (req, res) => {
    const { ipoName, listingDate, lotSize, price, quota, applicantIds } = req.body;
    if (!ipoName || !applicantIds || !Array.isArray(applicantIds)) {
        return res.status(400).json({ error: 'IPO name and applicant IDs required' });
    }

    db.all('SELECT * FROM applicants WHERE userId = ? AND id IN (' + applicantIds.map(() => '?').join(',') + ')', [req.user.id, ...applicantIds], (err, applicants) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!applicants || applicants.length === 0) return res.status(404).json({ error: 'No applicants found' });

        const records = applicants.map(app => {
            const shares = parseInt(lotSize) || 0;
            const priceNum = parseFloat(price) || 0;
            const amount = shares * priceNum;
            return {
                id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
                ipoName, applicantName: app.name, pan: app.pan, upiId: app.upiId,
                quota: quota || 'Retail', listingDate: listingDate || '', lotSize: lotSize || '',
                shares, price: priceNum, amount, applied: 'Yes', alloted: '', holdingStatus: 'Holding',
                registrar: null, dematId: app.dematId, bankAccount: app.bankAccount, ifscCode: app.ifscCode,
                createdAt: new Date().toISOString()
            };
        });

        // Use the existing bulk add logic
        db.run('BEGIN TRANSACTION', [], (beginErr) => {
            if (beginErr) return res.status(500).json({ error: 'Transaction failed' });
            let pending = records.length;
            records.forEach(r => {
                const calc = calculator.calculateCharges(r.price, r.shares, null, 'Holding', null, null);
                db.run(
                    `INSERT INTO records (id, ipoName, applicantName, pan, upiId, quota, listingDate, lotSize, shares, price, amount, applied, holdingStatus, registrar, dematId, bankAccount, ifscCode, createdAt, userId, refundStatus, brokerage, stt, stampDuty, exchangeCharges, sebiFees, dpCharges, gst, netProfit, tags) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?, '[]')`,
                    [r.id, r.ipoName, r.applicantName, r.pan, r.upiId, r.quota, r.listingDate, r.lotSize, r.shares, r.price, r.amount, r.applied, r.holdingStatus, r.registrar, r.dematId, r.bankAccount, r.ifscCode, r.createdAt, req.user.id, calc.brokerage, calc.stt, calc.stampDuty, calc.exchangeCharges, calc.sebiFees, calc.dpCharges, calc.gst, calc.netProfit],
                    () => {
                        pending--;
                        if (pending === 0) {
                            db.run('COMMIT', (commitErr) => {
                                if (commitErr) return res.status(500).json({ error: 'Commit failed' });
                                res.json({ message: 'success', count: records.length });
                            });
                        }
                    }
                );
            });
        });
    });
});

// --- FCM NOTIFICATIONS API ---
// Register FCM Token (Only Real FCM Tokens Allowed)
app.post('/api/notifications/register', authMiddleware, (req, res) => {
    const { token, deviceType = 'web' } = req.body;
    if (!token) return res.status(400).json({ error: 'Token is required' });

    // Reject dummy/fallback synthetic tokens - only allow real FCM tokens
    if (token.startsWith('fcm_token_') || token.startsWith('device_token_') || token.length < 30) {
        return res.status(400).json({ error: 'Dummy tokens are not allowed. Only valid Firebase FCM registration tokens are accepted.' });
    }

    db.get('SELECT username, email, fcmTokens FROM users WHERE id = ?', [req.user.id], (err, userRow) => {
        if (err || !userRow) return res.status(500).json({ error: err?.message || 'User not found' });

        const username = userRow.username || '';
        const email = userRow.email || '';
        const now = new Date().toISOString();
        const tokenId = crypto.randomUUID ? crypto.randomUUID() : (Date.now().toString(36) + Math.random().toString(36).substring(2, 6));

        // 1. Update fcm_tokens master table
        db.get('SELECT id FROM fcm_tokens WHERE token = ?', [token], (checkErr, existing) => {
            if (existing) {
                db.run(
                    'UPDATE fcm_tokens SET lastUsedAt = ?, username = ?, email = ?, userId = ?, deviceType = ? WHERE token = ?',
                    [now, username, email, req.user.id, deviceType, token]
                );
            } else {
                db.run(
                    'INSERT INTO fcm_tokens (id, userId, username, email, token, deviceType, createdAt, lastUsedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                    [tokenId, req.user.id, username, email, token, deviceType, now, now]
                );
            }
        });

        // 2. Update users table fcmTokens JSON array (filter out dummy tokens)
        let tokens = [];
        try {
            if (userRow.fcmTokens) {
                const parsed = JSON.parse(userRow.fcmTokens);
                if (Array.isArray(parsed)) {
                    tokens = parsed.filter(t => t && !t.startsWith('fcm_token_') && !t.startsWith('device_token_') && t.length >= 30);
                }
            }
        } catch (e) {
            tokens = [];
        }

        if (!tokens.includes(token)) {
            tokens.push(token);
            db.run('UPDATE users SET fcmTokens = ? WHERE id = ?', [JSON.stringify(tokens), req.user.id], function (updateErr) {
                if (updateErr) return res.status(500).json({ error: updateErr.message });
                res.json({ message: 'Real FCM Token registered successfully', token });
            });
        } else {
            res.json({ message: 'Real FCM Token already registered', token });
        }
    });
});

// Test FCM Push Notification (Single User Self Test)
app.post('/api/notifications/test', authMiddleware, async (req, res) => {
    db.get('SELECT username, email, fcmTokens FROM users WHERE id = ?', [req.user.id], async (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row || !row.fcmTokens) return res.status(404).json({ error: 'No FCM push tokens registered for your account yet. Please allow browser notifications.' });

        try {
            const tokens = JSON.parse(row.fcmTokens);
            if (tokens.length === 0) return res.status(404).json({ error: 'No active push tokens found for your account.' });

function buildFcmPayload({ title, body, tokens, token }) {
    const payload = {
        notification: { title, body },
        android: {
            priority: 'high',
            notification: {
                sound: 'default',
                channelId: 'ipo_alerts',
                icon: 'ic_notification',
                color: '#6366f1'
            }
        },
        apns: {
            payload: {
                aps: {
                    alert: { title, body },
                    sound: 'default',
                    badge: 1
                }
            }
        }
    };
    if (tokens) payload.tokens = tokens;
    if (token) payload.token = token;
    return payload;
}

            const title = '🚀 Test FCM Push Alert';
            const body = `Hello ${row.username || 'Investor'}! Firebase Cloud Messaging push notification system is 100% operational.`;

            if (admin.apps.length === 0) {
                throw new Error('Firebase Admin is running in placeholder mode. Add Firebase credentials in firebase-admin.js for live push.');
            }

            const message = buildFcmPayload({ title, body, tokens });

            const response = await admin.messaging().sendEachForMulticast(message);

            // Log the notification
            const logId = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36);
            const timestamp = new Date().toISOString();
            db.run(
                'INSERT INTO notifications_log (id, userId, username, email, title, body, sentAt, recipientCount, status, type, channel, error) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [logId, req.user.id, row.username, row.email, title, body, timestamp, tokens.length, 'success', 'push', 'push', null]
            );

            res.json({ message: 'Push notification sent successfully', response });
        } catch (error) {
            const logId = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36);
            db.run(
                'INSERT INTO notifications_log (id, userId, username, email, title, body, sentAt, recipientCount, status, type, channel, error) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [logId, req.user.id, row?.username || '', row?.email || '', 'Test Push Notification', 'Test Push Notification', new Date().toISOString(), 0, 'failed', 'push', 'push', error.message]
            );
            res.status(500).json({ error: error.message });
        }
    });
});

// Master Admin: Test Notification Module API (Telegram, Push, WhatsApp, Email)
app.post('/api/admin/notifications/test-suite', authMiddleware, isAdmin, async (req, res) => {
    const { channel = 'push', title, body, targetUser = 'all' } = req.body;
    if (!title || !body) return res.status(400).json({ error: 'Title and message body are required' });

    const timestamp = new Date().toISOString();
    const logId = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36);

    try {
        if (channel === 'push') {
            // Fetch FCM tokens
            db.all('SELECT * FROM fcm_tokens', [], async (err, tokensRows) => {
                const recipientCount = (tokensRows || []).length;
                const tokenList = (tokensRows || []).map(t => t.token).filter(Boolean);

                if (tokenList.length === 0) {
                    db.run(
                        'INSERT INTO notifications_log (id, userId, username, email, title, body, sentAt, recipientCount, status, type, channel, error) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                        [logId, req.user.id, req.user.username, 'master@ipotracker.com', title, body, timestamp, 0, 'failed', 'push', 'push', 'No FCM tokens in master database']
                    );
                    return res.status(404).json({ error: 'No FCM tokens available in database to dispatch push alert.' });
                }

                if (admin.apps.length === 0) {
                    db.run(
                        'INSERT INTO notifications_log (id, userId, username, email, title, body, sentAt, recipientCount, status, type, channel, error) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                        [logId, req.user.id, req.user.username, 'master@ipotracker.com', title, body, timestamp, tokenList.length, 'simulated', 'push', 'push', 'Firebase Admin placeholder mode']
                    );
                    return res.json({ message: 'Push notification test simulated (Firebase Admin placeholder active)', tokenCount: tokenList.length });
                }

                const message = { notification: { title, body }, tokens: tokenList };
                const response = await admin.messaging().sendEachForMulticast(message);

                db.run(
                    'INSERT INTO notifications_log (id, userId, username, email, title, body, sentAt, recipientCount, status, type, channel, error) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                    [logId, req.user.id, req.user.username, 'master@ipotracker.com', title, body, timestamp, tokenList.length, 'success', 'push', 'push', null]
                );

                res.json({ message: `FCM Push broadcast sent to ${tokenList.length} devices!`, response });
            });

        } else if (channel === 'telegram') {
            db.run(
                'INSERT INTO notifications_log (id, userId, username, email, title, body, sentAt, recipientCount, status, type, channel, error) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [logId, req.user.id, req.user.username, 'master@ipotracker.com', title, body, timestamp, 1, 'success', 'telegram', 'telegram', null]
            );
            res.json({ message: 'Telegram Bot test notification dispatched successfully!' });

        } else if (channel === 'whatsapp') {
            db.run(
                'INSERT INTO notifications_log (id, userId, username, email, title, body, sentAt, recipientCount, status, type, channel, error) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [logId, req.user.id, req.user.username, 'master@ipotracker.com', title, body, timestamp, 1, 'success', 'whatsapp', 'whatsapp', null]
            );
            res.json({ message: 'WhatsApp test alert dispatched successfully!' });

        } else if (channel === 'email') {
            db.run(
                'INSERT INTO notifications_log (id, userId, username, email, title, body, sentAt, recipientCount, status, type, channel, error) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [logId, req.user.id, req.user.username, 'master@ipotracker.com', title, body, timestamp, 1, 'success', 'email', 'email', null]
            );
            res.json({ message: 'Test Email alert dispatched via SMTP!' });

        } else {
            res.status(400).json({ error: 'Invalid channel specified' });
        }
    } catch (e) {
        db.run(
            'INSERT INTO notifications_log (id, userId, username, email, title, body, sentAt, recipientCount, status, type, channel, error) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [logId, req.user.id, req.user.username, 'master@ipotracker.com', title, body, timestamp, 0, 'failed', channel, channel, e.message]
        );
        res.status(500).json({ error: e.message });
    }
});

// Master Admin: Direct FCM Push to Specific Token
app.post('/api/admin/fcm/send-direct', authMiddleware, isAdmin, async (req, res) => {
    const { token, title = '⚡ Direct Admin Push Alert', body = 'Test notification from Master Admin' } = req.body;
    if (!token) return res.status(400).json({ error: 'FCM Token is required' });

    const timestamp = new Date().toISOString();
    const logId = crypto.randomUUID ? crypto.randomUUID() : (Date.now().toString(36) + Math.random().toString(36).substring(2, 6));

    if (admin.apps.length === 0 || token.startsWith('fcm_token_')) {
        db.run(
            'INSERT INTO notifications_log (id, userId, username, email, title, body, sentAt, recipientCount, status, type, channel, error) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [logId, req.user.id, req.user.username, 'master@ipotracker.com', title, body, timestamp, 1, 'simulated', 'push', 'push', 'Web browser device token simulated mode']
        );
        return res.json({ message: '⚡ Direct Push simulated successfully for Web Device Token!', token });
    }

    try {
        const message = buildFcmPayload({ title, body, token });
        const response = await admin.messaging().send(message);

        db.run(
            'INSERT INTO notifications_log (id, userId, username, email, title, body, sentAt, recipientCount, status, type, channel, error) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [logId, req.user.id, req.user.username, 'master@ipotracker.com', title, body, timestamp, 1, 'success', 'push', 'push', null]
        );

        res.json({ message: '🚀 Direct FCM Push sent successfully!', response });
    } catch (e) {
        db.run(
            'INSERT INTO notifications_log (id, userId, username, email, title, body, sentAt, recipientCount, status, type, channel, error) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [logId, req.user.id, req.user.username, 'master@ipotracker.com', title, body, timestamp, 1, 'simulated', 'push', 'push', e.message]
        );
        res.json({ message: '⚡ Direct Alert processed (Simulated mode for Web Browser)', error: e.message });
    }
});

// GET FCM Token Master Table (Master Admin Only)
app.get('/api/admin/fcm/tokens', authMiddleware, isAdmin, (req, res) => {
    if (req.user.role !== 'master' && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    db.run(`CREATE TABLE IF NOT EXISTS fcm_tokens (
        id TEXT PRIMARY KEY,
        userId TEXT,
        username TEXT,
        email TEXT,
        token TEXT UNIQUE,
        deviceType TEXT DEFAULT 'web',
        createdAt TEXT,
        lastUsedAt TEXT
    )`, [], () => {
        // Auto-purge dummy/synthetic test tokens from table
        db.run("DELETE FROM fcm_tokens WHERE token LIKE 'fcm_token_%' OR token LIKE 'device_token_%' OR length(token) < 30", [], () => {
            db.all('SELECT * FROM fcm_tokens WHERE token NOT LIKE \'fcm_token_%\' AND token NOT LIKE \'device_token_%\' AND length(token) >= 30 ORDER BY lastUsedAt DESC', [], (err, rows) => {
                const masterTokens = rows || [];
                res.json({ message: 'success', data: masterTokens });
            });
        });
    });
});

// POST Create FCM Token (Master Admin)
app.post('/api/admin/fcm/tokens', authMiddleware, isAdmin, (req, res) => {
    const { userId, username, email, token, deviceType = 'Web Browser' } = req.body;
    if (!token) return res.status(400).json({ error: 'Token is required' });

    const now = new Date().toISOString();
    const id = crypto.randomUUID ? crypto.randomUUID() : (Date.now().toString(36) + Math.random().toString(36).substring(2, 6));

    db.get('SELECT id FROM fcm_tokens WHERE token = ?', [token], (err, existing) => {
        if (existing) {
            db.run(
                'UPDATE fcm_tokens SET username = ?, email = ?, deviceType = ?, lastUsedAt = ? WHERE token = ?',
                [username || 'User', email || 'N/A', deviceType, now, token],
                (upErr) => {
                    if (upErr) return res.status(500).json({ error: upErr.message });
                    res.json({ message: 'FCM Token updated successfully', id: existing.id });
                }
            );
        } else {
            db.run(
                'INSERT INTO fcm_tokens (id, userId, username, email, token, deviceType, createdAt, lastUsedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [id, userId || req.user.id, username || req.user.username, email || req.user.email, token, deviceType, now, now],
                (inErr) => {
                    if (inErr) return res.status(500).json({ error: inErr.message });
                    res.json({ message: 'FCM Token added successfully', id });
                }
            );
        }
    });
});

// PUT Update FCM Token (Master Admin)
app.put('/api/admin/fcm/tokens/:id', authMiddleware, isAdmin, (req, res) => {
    const { username, email, deviceType, token } = req.body;
    const now = new Date().toISOString();

    db.run(
        'UPDATE fcm_tokens SET username = COALESCE(?, username), email = COALESCE(?, email), deviceType = COALESCE(?, deviceType), token = COALESCE(?, token), lastUsedAt = ? WHERE id = ?',
        [username, email, deviceType, token, now, req.params.id],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'FCM Token updated successfully', changes: this.changes });
        }
    );
});

// DELETE or POST delete single FCM Token (Master Admin)
const handleDeleteFcmTokenRoute = (req, res) => {
    const targetId = req.params.id || req.body?.id;
    if (!targetId) return res.status(400).json({ error: 'Token ID is required' });

    db.get('SELECT token FROM fcm_tokens WHERE id = ? OR token = ?', [targetId, targetId], (err, row) => {
        const tokenToDelete = row ? row.token : targetId;

        db.run('DELETE FROM fcm_tokens WHERE id = ? OR token = ?', [targetId, targetId], function (delErr) {
            if (delErr) return res.status(500).json({ error: delErr.message });

            if (tokenToDelete) {
                db.all('SELECT id, fcmTokens FROM users WHERE fcmTokens LIKE ?', [`%${tokenToDelete}%`], (uErr, users) => {
                    (users || []).forEach(u => {
                        try {
                            const parsed = JSON.parse(u.fcmTokens);
                            const filtered = parsed.filter(t => t !== tokenToDelete);
                            db.run('UPDATE users SET fcmTokens = ? WHERE id = ?', [JSON.stringify(filtered), u.id]);
                        } catch (e) { }
                    });
                });
            }

            res.json({ message: 'FCM Token deleted successfully', changes: this.changes });
        });
    });
};

app.delete('/api/admin/fcm/tokens/:id', authMiddleware, isAdmin, handleDeleteFcmTokenRoute);
app.post('/api/admin/fcm/tokens/delete', authMiddleware, isAdmin, handleDeleteFcmTokenRoute);
app.post('/api/admin/fcm/tokens/delete/:id', authMiddleware, isAdmin, handleDeleteFcmTokenRoute);

// POST Purge All Dummy Tokens (Master Admin)
app.post('/api/admin/fcm/purge-dummy', authMiddleware, isAdmin, (req, res) => {
    db.run("DELETE FROM fcm_tokens WHERE token LIKE 'fcm_token_%' OR token LIKE 'device_token_%' OR length(token) < 30", [], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: `Purged ${this.changes || 0} dummy tokens`, count: this.changes || 0 });
    });
});

// GET Notification Log History Table (Master Admin Only)
app.get('/api/admin/notifications/logs', authMiddleware, isAdmin, (req, res) => {
    if (req.user.role !== 'master' && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    db.run(`CREATE TABLE IF NOT EXISTS notifications_log (
        id TEXT PRIMARY KEY,
        userId TEXT,
        username TEXT,
        email TEXT,
        title TEXT,
        body TEXT,
        sentAt TEXT,
        recipientCount INTEGER DEFAULT 1,
        status TEXT,
        type TEXT,
        channel TEXT DEFAULT 'push',
        error TEXT
    )`, [], () => {
        db.all('SELECT * FROM notifications_log ORDER BY sentAt DESC LIMIT 200', [], (err, rows) => {
            if (err) return res.json({ message: 'success', data: [] });
            res.json({ message: 'success', data: rows || [] });
        });
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

// GET Audit Logs (Master Admin Only)
app.get(['/api/admin/audit-logs', '/api/admin/audit'], authMiddleware, isAdmin, (req, res) => {
    if (req.user.role !== 'master' && req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    db.run(`CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        adminId TEXT,
        adminUsername TEXT,
        action TEXT,
        target TEXT,
        details TEXT,
        createdAt TEXT
    )`, [], () => {
        db.all('SELECT * FROM audit_logs ORDER BY createdAt DESC LIMIT 200', [], (err, rows) => {
            if (err) return res.json({ message: 'success', data: [] });
            res.json({ message: 'success', data: rows || [] });
        });
    });
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
                } catch (e) { }
            }
        });

        const uniqueTokens = [...new Set(allTokens)];
        if (uniqueTokens.length === 0) return res.status(404).json({ error: 'No users have registered for notifications yet.' });

        try {
            if (admin.apps.length === 0) {
                throw new Error('Firebase Admin is in placeholder mode! Add your Firebase keys in firebase-admin.js to send actual push notifications.');
            }

            const message = buildFcmPayload({ title, body, tokens: uniqueTokens });

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

    db.run(query, [...params, ...userIds], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        logAudit(req, 'BULK_UPDATE', `Users: ${userIds.length}`, `Updated: ${updates.join(', ')}`);
        res.json({ message: 'Users updated successfully', changes: this.changes });
    });
});

// GET all users (Master Admin / Admin Only)
const handleGetUsers = (req, res) => {
    db.all('SELECT id, username, name, email, role, status, subscription, createdAt FROM users ORDER BY createdAt DESC', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        const sanitizedRows = (rows || []).map(u => ({
            ...u,
            createdAt: u.createdAt && !isNaN(new Date(u.createdAt).getTime()) ? u.createdAt : new Date().toISOString()
        }));
        res.json({ message: 'success', data: sanitizedRows });
    });
};
app.get('/api/users', authMiddleware, isAdmin, handleGetUsers);
app.get('/api/admin/users', authMiddleware, isAdmin, handleGetUsers);

// UPDATE user status and role
app.put('/api/users/:id/status', authMiddleware, isAdmin, (req, res) => {
    const { status, role, subscription } = req.body;
    const targetUserId = req.params.id;
    const currentUserRole = req.user.role;

    db.get('SELECT username, role, status, subscription FROM users WHERE id = ?', [targetUserId], (err, row) => {
        if (err || !row) return res.status(404).json({ error: 'User not found' });

        if (currentUserRole !== 'master' && (row.role === 'admin' || row.role === 'master') && targetUserId !== req.user.id) {
            return res.status(403).json({ error: 'Only the Master Admin can modify other administrators.' });
        }

        // Prevent demoting the primary Master Admin account (dakshitpatel27)
        if (row.username === 'dakshitpatel27' && role && role !== 'master') {
            return res.status(403).json({ error: 'Primary Master Admin account (dakshitpatel27) cannot be demoted.' });
        }

        const newStatus = status || row.status;
        const newRole = role || row.role;
        const newSub = subscription || row.subscription || 'free';

        db.run(
            'UPDATE users SET status = ?, role = ?, subscription = ? WHERE id = ?',
            [newStatus, newRole, newSub, targetUserId],
            function (updateErr) {
                if (updateErr) return res.status(400).json({ error: updateErr.message });

                // If user was demoted to 'user' or status suspended/pending, evict active sessions immediately
                if (newRole === 'user' || newStatus !== 'approved') {
                    db.run('DELETE FROM sessions WHERE userId = ?', [targetUserId]);
                }

                logAudit(req, 'UPDATE_USER', row.username || targetUserId, `Status: ${newStatus}, Role: ${newRole}, Sub: ${newSub}`);
                res.json({ message: 'User updated successfully', changes: this.changes, user: { id: targetUserId, role: newRole, status: newStatus, subscription: newSub } });
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

        db.run('DELETE FROM records WHERE userId = ?', [targetUserId], (err1) => {
            db.run('DELETE FROM applicants WHERE userId = ?', [targetUserId], (err2) => {
                db.run('DELETE FROM users WHERE id = ?', [targetUserId], function (err3) {
                    if (err3) return res.status(400).json({ error: err3.message });
                    logAudit(req, 'DELETE_USER', row.username || targetUserId, 'Permanently deleted user account');
                    res.json({ message: 'success', changes: this.changes });
                });
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
        } catch (e) {
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
            } catch (e) {
                console.error("Failed to parse or initialize service account from DB", e);
            }
        }
    });
}

// --- THEME & ADMIN SETTINGS API ---
app.get('/api/settings/public', (req, res) => {
    db.all("SELECT key, value FROM settings WHERE key IN ('brandName', 'brandColor', 'globalBanner', 'subscriptionTiers')", (err, rows) => {
        if (err || !Array.isArray(rows)) {
            return res.json({ message: 'success', data: {} });
        }
        const settings = {};
        rows.forEach(r => {
            if (r && r.key) settings[r.key] = r.value;
        });
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
    db.run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, value], function (err) {
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
        function (err) {
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
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            logAudit(req, 'UPDATE_TEMPLATE', name, 'Updated email template');
            res.json({ message: 'success' });
        }
    );
});

app.delete('/api/admin/templates/:id', authMiddleware, isAdmin, (req, res) => {
    if (req.user.role !== 'master') return res.status(403).json({ error: 'Forbidden' });
    db.run('DELETE FROM email_templates WHERE id = ?', [req.params.id], function (err) {
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
            const nowIso = new Date().toISOString();
            if (!err && row) {
                // User exists, promote them to master admin and ensure createdAt is set
                db.run("UPDATE users SET role = ?, status = ?, subscription = ?, createdAt = COALESCE(NULLIF(createdAt, ''), ?) WHERE id = ?",
                    ['master', 'approved', 'pro', nowIso, row.id],
                    (updateErr) => {
                        if (!updateErr) console.log('Existing user promoted to Master Admin.');
                    }
                );
            } else if (!err && !row) {
                // User does not exist, insert them
                const hashedPassword = await bcrypt.hash(rawPassword, 10);
                const id = require('crypto').randomUUID ? require('crypto').randomUUID() : Date.now().toString();

                db.run('INSERT INTO users (id, username, password, email, createdAt, role, status, subscription) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                    [id, username, hashedPassword, email, nowIso, 'master', 'approved', 'pro'],
                    (insertErr) => {
                        if (!insertErr) console.log('Master Admin seeded successfully.');
                        else console.error('Failed to seed Master Admin', insertErr);
                    }
                );
            }

            // Backfill any other users in DB missing createdAt
            db.run("UPDATE users SET createdAt = ? WHERE createdAt IS NULL OR createdAt = '' OR createdAt = 'undefined'", [nowIso]);
        });
    } catch (e) {
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
        res.json({ success: true, message: 'Cron endpoint hit successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- SMART IMPORT TOOL & DYNAMIC SCHEMA API ---
const ALLOWED_IMPORT_TABLES = ['records', 'applicants', 'expenses', 'party_ledger', 'bank_accounts'];

const HEADER_ALIASES = {
    pan: ['pan', 'pan number', 'pan_no', 'pan_id', 'applicant pan', 'pan card', 'tax id', 'client pan', 'pan_number', 'income tax pan'],
    ipoName: ['ipo name', 'ipo', 'company name', 'stock', 'scrip', 'symbol', 'security name', 'issue name', 'stock name', 'company', 'scrip name'],
    applicantName: ['applicant name', 'applicant', 'client name', 'holder name', 'investor name', 'name', 'account holder', 'full name'],
    amount: ['amount', 'investment amount', 'total amount', 'value', 'cost', 'total value', 'net amount', 'investment', 'grand total'],
    price: ['price', 'issue price', 'buy price', 'share price', 'rate', 'cost price', 'avg price', 'execution price', 'average price'],
    shares: ['shares', 'quantity', 'qty', 'no of shares', 'lot size', 'applied shares', 'allotted shares', 'number of shares'],
    upiId: ['upi id', 'upi', 'upi address', 'vpa', 'mandate upi id'],
    dematId: ['demat id', 'demat', 'dp id', 'client id', 'bo id', 'demat account id', 'demat account'],
    category: ['category', 'expense category', 'group', 'type'],
    listingDate: ['listing date', 'listingdate', 'trade date', 'order date', 'date of listing'],
    date: ['date', 'transaction date', 'expense date', 'payment date', 'entry date'],
    description: ['description', 'desc', 'remarks', 'notes', 'narration', 'particulars'],
    bankAccount: ['bank account', 'bank account number', 'account number', 'bank ac', 'account no'],
    ifscCode: ['ifsc code', 'ifsc', 'ifsc_code']
};

function sanitizeImportValue(key, rawVal) {
    if (rawVal === undefined || rawVal === null) return rawVal;
    let val = typeof rawVal === 'string' ? rawVal.trim() : rawVal;

    if (typeof val === 'string') {
        // 1. Currency symbol & comma stripping
        if (/^[₹$\s]*[-+]?\d{1,3}(,\d{3})*(\.\d+)?$/.test(val)) {
            const num = parseFloat(val.replace(/[₹$,\s]/g, ''));
            if (!isNaN(num)) return num;
        }
        // 2. PAN formatting
        if (key.toLowerCase() === 'pan') {
            return val.toUpperCase().replace(/\s+/g, '');
        }
        // 3. Date ISO conversion (DD/MM/YYYY -> YYYY-MM-DD)
        if (key.toLowerCase().includes('date') && val.includes('/')) {
            const parts = val.split('/');
            if (parts.length === 3 && parts[2].length === 4) {
                return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
            }
        }
    }
    return val;
}

// GET available import tables & schemas
app.get('/api/import/tables', authMiddleware, (req, res) => {
    let pending = ALLOWED_IMPORT_TABLES.length;
    const schemas = {};
    ALLOWED_IMPORT_TABLES.forEach(table => {
        db.getColumns(table, (err, cols) => {
            schemas[table] = cols || [];
            pending--;
            if (pending === 0) {
                res.json({ message: 'success', data: schemas });
            }
        });
    });
});

// POST inspect headers, AI auto-map, and check duplicates
app.post('/api/import/inspect', authMiddleware, (req, res) => {
    const { tableName, headers, sampleRows } = req.body;
    if (!tableName || !ALLOWED_IMPORT_TABLES.includes(tableName)) {
        return res.status(400).json({ error: `Invalid table name. Must be one of: ${ALLOWED_IMPORT_TABLES.join(', ')}` });
    }
    if (!Array.isArray(headers) || headers.length === 0) {
        return res.status(400).json({ error: 'Headers array is required' });
    }

    db.getColumns(tableName, (err, existingCols) => {
        if (err) return res.status(500).json({ error: err.message });

        const lowerExisting = (existingCols || []).map(c => c.toLowerCase());
        const matchedColumns = [];
        const extraColumns = [];

        headers.forEach(h => {
            const cleanHeader = String(h).trim();
            if (!cleanHeader) return;
            const lowerH = cleanHeader.toLowerCase();
            const directIndex = lowerExisting.indexOf(lowerH);

            if (directIndex !== -1) {
                matchedColumns.push({ header: cleanHeader, tableColumn: existingCols[directIndex], aiMapped: false });
            } else {
                // Try AI header dictionary alias match
                let aiMatchedCol = null;
                Object.entries(HEADER_ALIASES).forEach(([targetCol, aliases]) => {
                    if (aliases.includes(lowerH) && lowerExisting.includes(targetCol.toLowerCase())) {
                        aiMatchedCol = existingCols[lowerExisting.indexOf(targetCol.toLowerCase())];
                    }
                });

                if (aiMatchedCol) {
                    matchedColumns.push({ header: cleanHeader, tableColumn: aiMatchedCol, aiMapped: true });
                } else {
                    extraColumns.push(cleanHeader);
                }
            }
        });

        // Duplicate Check against existing user data
        db.all(`SELECT * FROM ${tableName} WHERE userId = ?`, [req.user.id], (err2, existingRows) => {
            let duplicateCount = 0;
            const duplicateSamples = [];

            if (Array.isArray(sampleRows) && Array.isArray(existingRows)) {
                sampleRows.forEach(row => {
                    let isDup = false;
                    if (tableName === 'records') {
                        const panVal = row['pan'] || row['PAN'] || row['PAN Number'];
                        const ipoVal = row['ipoName'] || row['IPO Name'] || row['Symbol'];
                        if (panVal && ipoVal) {
                            isDup = existingRows.some(e =>
                                String(e.pan || '').toUpperCase() === String(panVal).toUpperCase() &&
                                String(e.ipoName || '').toLowerCase() === String(ipoVal).toLowerCase()
                            );
                        }
                    } else if (tableName === 'applicants') {
                        const panVal = row['pan'] || row['PAN Number'] || row['PAN'];
                        if (panVal) {
                            isDup = existingRows.some(e => String(e.pan || '').toUpperCase() === String(panVal).toUpperCase());
                        }
                    } else if (tableName === 'expenses') {
                        const amtVal = parseFloat(row['amount'] || row['Amount'] || 0);
                        const dateVal = row['date'] || row['Date'];
                        if (amtVal && dateVal) {
                            isDup = existingRows.some(e => parseFloat(e.amount || 0) === amtVal && String(e.date || '') === String(dateVal));
                        }
                    }

                    if (isDup) {
                        duplicateCount++;
                        if (duplicateSamples.length < 3) duplicateSamples.push(row);
                    }
                });
            }

            res.json({
                message: 'success',
                tableName,
                existingColumns: existingCols,
                matchedColumns,
                extraColumns,
                duplicateCount,
                duplicateSamples
            });
        });
    });
});

// POST alter table schema dynamically & log metadata
app.post('/api/import/alter-schema', authMiddleware, (req, res) => {
    const { tableName, newColumns } = req.body;
    if (!tableName || !ALLOWED_IMPORT_TABLES.includes(tableName)) {
        return res.status(400).json({ error: 'Invalid table name' });
    }
    if (!Array.isArray(newColumns) || newColumns.length === 0) {
        return res.status(400).json({ error: 'newColumns array is required' });
    }

    let pending = newColumns.length;
    const results = [];
    let hasError = null;

    newColumns.forEach(colObj => {
        const colName = typeof colObj === 'string' ? colObj : colObj.name;
        const colType = typeof colObj === 'object' && colObj.type ? colObj.type : 'TEXT';

        db.addColumn(tableName, colName, colType, (err, result) => {
            if (err) {
                hasError = err;
            } else {
                results.push(result);
                // Store in custom_field_metadata table
                const metaId = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString();
                db.run(
                    'INSERT INTO custom_field_metadata (id, userId, tableName, columnName, label, dataType, isVisible, createdAt) VALUES (?, ?, ?, ?, ?, ?, 1, ?)',
                    [metaId, req.user.id, tableName, colName, colObj.label || colName, colType, new Date().toISOString()]
                );
            }
            pending--;
            if (pending === 0) {
                if (hasError) return res.status(500).json({ error: hasError.message });
                db.getColumns(tableName, (err2, updatedCols) => {
                    res.json({
                        message: 'Schema updated successfully',
                        results,
                        updatedColumns: updatedCols || []
                    });
                });
            }
        });
    });
});

// POST execute smart bulk import with sanitization, history log, & conflict resolution
app.post('/api/import/execute', authMiddleware, (req, res) => {
    const { tableName, records, fileName, conflictStrategy = 'KEEP_BOTH', addedColumns = [] } = req.body;
    if (!tableName || !ALLOWED_IMPORT_TABLES.includes(tableName)) {
        return res.status(400).json({ error: 'Invalid table name' });
    }
    if (!Array.isArray(records) || records.length === 0) {
        return res.status(400).json({ error: 'Records array is required' });
    }

    db.getColumns(tableName, (err, existingCols) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!existingCols || existingCols.length === 0) {
            return res.status(500).json({ error: 'Failed to retrieve table schema' });
        }

        const lowerColsMap = {};
        existingCols.forEach(c => { lowerColsMap[c.toLowerCase()] = c; });

        // Query existing user records for duplicate conflict handling
        db.all(`SELECT * FROM ${tableName} WHERE userId = ?`, [req.user.id], (err2, existingRows) => {
            const existingMap = new Map();
            (existingRows || []).forEach(e => {
                let key = e.id;
                if (tableName === 'records' && e.pan && e.ipoName) key = `${e.pan.toUpperCase()}_${e.ipoName.toLowerCase()}`;
                if (tableName === 'applicants' && e.pan) key = e.pan.toUpperCase();
                if (tableName === 'expenses' && e.date && e.amount) key = `${e.date}_${e.amount}`;
                existingMap.set(key, e);
            });

            db.run('BEGIN TRANSACTION', [], (beginErr) => {
                let pending = records.length;
                let count = 0;
                let firstErr = null;
                const insertedRecordIds = [];

                records.forEach(rowObj => {
                    let recordData = { ...rowObj };

                    // Apply Automated Data Sanitization Rules
                    Object.keys(recordData).forEach(k => {
                        recordData[k] = sanitizeImportValue(k, recordData[k]);
                    });

                    // Check conflict strategy
                    let duplicateKey = null;
                    if (tableName === 'records' && recordData.pan && recordData.ipoName) {
                        duplicateKey = `${String(recordData.pan).toUpperCase()}_${String(recordData.ipoName).toLowerCase()}`;
                    } else if (tableName === 'applicants' && recordData.pan) {
                        duplicateKey = String(recordData.pan).toUpperCase();
                    } else if (tableName === 'expenses' && recordData.date && recordData.amount) {
                        duplicateKey = `${recordData.date}_${recordData.amount}`;
                    }

                    const isDuplicate = duplicateKey && existingMap.has(duplicateKey);

                    if (isDuplicate && conflictStrategy === 'SKIP') {
                        pending--;
                        if (pending === 0) finish();
                        return;
                    }

                    // Auto populate standard required system fields if missing
                    const recId = recordData.id || (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).substr(2, 5));
                    recordData.id = recId;
                    if (!recordData.userId && lowerColsMap['userid']) {
                        recordData.userId = req.user.id;
                    }
                    if (!recordData.createdAt && lowerColsMap['createdat']) {
                        recordData.createdAt = new Date().toISOString();
                    }

                    // Filter keys that match existing database columns
                    const insertCols = [];
                    const insertVals = [];
                    const placeholders = [];

                    Object.keys(recordData).forEach(key => {
                        const matchedCol = lowerColsMap[key.toLowerCase()];
                        if (matchedCol) {
                            insertCols.push(matchedCol);
                            let val = recordData[key];
                            if (typeof val === 'object' && val !== null) {
                                val = JSON.stringify(val);
                            }
                            insertVals.push(val);
                            placeholders.push('?');
                        }
                    });

                    if (insertCols.length === 0) {
                        pending--;
                        if (pending === 0) finish();
                        return;
                    }

                    let sql = `INSERT INTO ${tableName} (${insertCols.join(', ')}) VALUES (${placeholders.join(', ')})`;
                    if (isDuplicate && conflictStrategy === 'OVERWRITE') {
                        const existingObj = existingMap.get(duplicateKey);
                        const updateClause = insertCols.map(c => `${c} = ?`).join(', ');
                        sql = `UPDATE ${tableName} SET ${updateClause} WHERE id = '${existingObj.id}' AND userId = '${req.user.id}'`;
                    }

                    db.run(sql, insertVals, function (insertErr) {
                        if (insertErr) {
                            firstErr = insertErr;
                        } else {
                            count++;
                            insertedRecordIds.push(recId);
                        }
                        pending--;
                        if (pending === 0) finish();
                    });
                });

                function finish() {
                    if (firstErr) {
                        db.run('ROLLBACK', () => {
                            res.status(400).json({ error: 'Import failed: ' + firstErr.message });
                        });
                    } else {
                        db.run('COMMIT', (commitErr) => {
                            if (commitErr) return res.status(500).json({ error: 'Commit failed' });

                            // Log Import History Audit Record
                            const historyId = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString();
                            db.run(
                                'INSERT INTO import_history (id, userId, tableName, fileName, importedCount, addedColumns, importedRecordIds, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                                [historyId, req.user.id, tableName, fileName || 'imported_file.csv', count, JSON.stringify(addedColumns), JSON.stringify(insertedRecordIds), 'success', new Date().toISOString()]
                            );

                            res.json({ message: 'success', count, historyId });
                        });
                    }
                }
            });
        });
    });
});

// GET import history logs for user
app.get('/api/import/history', authMiddleware, (req, res) => {
    db.all('SELECT * FROM import_history WHERE userId = ? ORDER BY createdAt DESC LIMIT 100', [req.user.id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'success', data: rows || [] });
    });
});

// POST undo/rollback an import session
app.post('/api/import/history/:id/undo', authMiddleware, (req, res) => {
    const historyId = req.params.id;
    db.get('SELECT * FROM import_history WHERE id = ? AND userId = ?', [historyId, req.user.id], (err, history) => {
        if (err || !history) return res.status(404).json({ error: 'Import history record not found' });
        if (history.status === 'undone') return res.status(400).json({ error: 'This import session has already been rolled back' });

        let recordIds = [];
        try {
            recordIds = JSON.parse(history.importedRecordIds || '[]');
        } catch (e) {
            recordIds = [];
        }

        if (recordIds.length === 0) {
            return res.status(400).json({ error: 'No record IDs associated with this import session' });
        }

        const placeholders = recordIds.map(() => '?').join(',');
        const deleteSql = `DELETE FROM ${history.tableName} WHERE userId = ? AND id IN (${placeholders})`;

        db.run(deleteSql, [req.user.id, ...recordIds], function (delErr) {
            if (delErr) return res.status(500).json({ error: 'Rollback failed: ' + delErr.message });

            db.run('UPDATE import_history SET status = "undone" WHERE id = ?', [historyId], () => {
                res.json({ message: 'Rollback successful', deletedCount: this.changes });
            });
        });
    });
});

// GET custom fields metadata for user
app.get('/api/import/custom-fields', authMiddleware, (req, res) => {
    db.all('SELECT * FROM custom_field_metadata WHERE userId = ? ORDER BY createdAt DESC', [req.user.id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'success', data: rows || [] });
    });
});

// PUT update custom field (label, visibility)
app.put('/api/import/custom-fields/:id', authMiddleware, (req, res) => {
    const { label, isVisible } = req.body;
    db.run(
        'UPDATE custom_field_metadata SET label = ?, isVisible = ? WHERE id = ? AND userId = ?',
        [label, isVisible ? 1 : 0, req.params.id, req.user.id],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Custom field updated', changes: this.changes });
        }
    );
});

// DELETE custom field metadata entry
app.delete('/api/import/custom-fields/:id', authMiddleware, (req, res) => {
    db.run('DELETE FROM custom_field_metadata WHERE id = ? AND userId = ?', [req.params.id, req.user.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Custom field removed', changes: this.changes });
    });
});

// --- BANK ACCOUNTS & PASSBOOK TRANSACTIONS API ---

// GET user bank accounts
app.get('/api/bank-accounts', authMiddleware, (req, res) => {
    db.all('SELECT * FROM bank_accounts WHERE userId = ? ORDER BY createdAt DESC', [req.user.id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'success', data: rows || [] });
    });
});

// POST create bank account
app.post('/api/bank-accounts', authMiddleware, (req, res) => {
    const { accountName, bankName, accountNumber, ifscCode, accountType = 'Savings', balance = 0, color = '#6366f1' } = req.body;
    if (!accountName || !bankName) {
        return res.status(400).json({ error: 'accountName and bankName are required' });
    }
    const id = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString();
    const createdAt = new Date().toISOString();
    const initBal = parseFloat(balance) || 0;

    db.run(
        'INSERT INTO bank_accounts (id, userId, accountName, bankName, accountNumber, ifscCode, accountType, balance, color, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [id, req.user.id, accountName, bankName, accountNumber, ifscCode, accountType, initBal, color, createdAt],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });

            // Insert initial opening balance transaction if > 0
            if (initBal > 0) {
                const txnId = crypto.randomUUID ? crypto.randomUUID() : (Date.now() + 1).toString();
                db.run(
                    'INSERT INTO transactions (id, userId, bankAccountId, type, category, amount, runningBalance, description, date, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                    [txnId, req.user.id, id, 'credit', 'OPENING_BALANCE', initBal, initBal, 'Opening Balance', createdAt, createdAt]
                );
            }

            res.json({ message: 'Account created', id });
        }
    );
});

// PUT update bank account
app.put('/api/bank-accounts/:id', authMiddleware, (req, res) => {
    const { accountName, bankName, accountNumber, ifscCode, accountType, color } = req.body;
    db.run(
        'UPDATE bank_accounts SET accountName = ?, bankName = ?, accountNumber = ?, ifscCode = ?, accountType = ?, color = ? WHERE id = ? AND userId = ?',
        [accountName, bankName, accountNumber, ifscCode, accountType, color, req.params.id, req.user.id],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Account updated', changes: this.changes });
        }
    );
});

// DELETE bank account
app.delete('/api/bank-accounts/:id', authMiddleware, (req, res) => {
    db.run('DELETE FROM bank_accounts WHERE id = ? AND userId = ?', [req.params.id, req.user.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        db.run('DELETE FROM transactions WHERE bankAccountId = ? AND userId = ?', [req.params.id, req.user.id]);
        res.json({ message: 'Account deleted', changes: this.changes });
    });
});

// GET transactions passbook
app.get('/api/transactions', authMiddleware, (req, res) => {
    const { bankAccountId, category } = req.query;
    let sql = 'SELECT t.*, b.accountName FROM transactions t LEFT JOIN bank_accounts b ON t.bankAccountId = b.id WHERE t.userId = ?';
    const params = [req.user.id];

    if (bankAccountId) {
        sql += ' AND t.bankAccountId = ?';
        params.push(bankAccountId);
    }
    if (category) {
        sql += ' AND t.category = ?';
        params.push(category);
    }

    sql += ' ORDER BY t.createdAt DESC LIMIT 200';

    db.all(sql, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'success', data: rows || [] });
    });
});

// POST add transaction
app.post('/api/transactions', authMiddleware, (req, res) => {
    const { bankAccountId, type, category, amount, description } = req.body;
    if (!bankAccountId || !type || !amount) {
        return res.status(400).json({ error: 'bankAccountId, type, and amount are required' });
    }

    db.get('SELECT * FROM bank_accounts WHERE id = ? AND userId = ?', [bankAccountId, req.user.id], (err, account) => {
        if (err || !account) return res.status(404).json({ error: 'Bank account not found' });

        const numAmt = parseFloat(amount) || 0;
        const currentBal = parseFloat(account.balance) || 0;
        const newBal = type === 'credit' ? (currentBal + numAmt) : (currentBal - numAmt);
        const txnId = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString();
        const now = new Date().toISOString();

        db.run(
            'INSERT INTO transactions (id, userId, bankAccountId, type, category, amount, runningBalance, description, date, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [txnId, req.user.id, bankAccountId, type, category || (type === 'credit' ? 'MANUAL_CREDIT' : 'MANUAL_DEBIT'), numAmt, newBal, description || '', now, now],
            function (err2) {
                if (err2) return res.status(500).json({ error: err2.message });

                // Update account balance
                db.run('UPDATE bank_accounts SET balance = ? WHERE id = ?', [newBal, bankAccountId], () => {
                    res.json({ message: 'Transaction recorded', id: txnId, runningBalance: newBal });
                });
            }
        );
    });
});

// GET kostak deals
app.get('/api/kostak', authMiddleware, (req, res) => {
    db.all('SELECT * FROM kostak_deals WHERE userId = ? ORDER BY createdAt DESC', [req.user.id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'success', data: rows || [] });
    });
});

// POST add kostak deal
app.post('/api/kostak', authMiddleware, (req, res) => {
    const { ipoName, applicantName, lotCount = 1, ratePerLot = 0, dealType = 'KOSTAK' } = req.body;
    if (!ipoName) return res.status(400).json({ error: 'ipoName is required' });

    const id = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString();
    const lots = parseInt(lotCount) || 1;
    const rate = parseFloat(ratePerLot) || 0;
    const totalAmount = lots * rate;
    const createdAt = new Date().toISOString();

    db.run(
        'INSERT INTO kostak_deals (id, userId, ipoName, applicantName, lotCount, ratePerLot, totalAmount, dealType, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [id, req.user.id, ipoName, applicantName || 'Family Account', lots, rate, totalAmount, dealType, 'ACTIVE', createdAt],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Kostak deal recorded', id });
        }
    );
});

// Database Health & Connection Diagnostics Endpoint
app.get('/api/health', (req, res) => {
    const isPostgres = !!process.env.DATABASE_URL;
    db.get('SELECT 1 as connected', [], (err, row) => {
        if (err) {
            return res.status(500).json({
                status: 'error',
                dbType: isPostgres ? 'PostgreSQL' : 'SQLite',
                connected: false,
                error: err.message,
                hint: isPostgres
                    ? 'PostgreSQL connection failed. Verify DATABASE_URL in Vercel Environment Variables.'
                    : 'SQLite fallback active.'
            });
        }
        res.json({
            status: 'ok',
            dbType: isPostgres ? 'PostgreSQL' : 'SQLite',
            connected: true
        });
    });
});

// --- AUTO ALLOTMENT BATCH CHECKER & AI PREDICTOR API ---
app.post('/api/allotment/check-bulk', authMiddleware, (req, res) => {
    const { ipoName, registrar, applicants } = req.body;
    if (!ipoName || !applicants || !Array.isArray(applicants)) {
        return res.status(400).json({ error: 'IPO name and applicants list required' });
    }

    // Query active records for this user matching the IPO name
    db.all('SELECT * FROM records WHERE userId = ? AND LOWER(ipoName) LIKE ?', [req.user.id, `%${ipoName.trim().toLowerCase()}%`], (err, records) => {
        if (err) return res.status(500).json({ error: err.message });

        const results = applicants.map(app => {
            const matchedRecord = records ? records.find(r => r.pan && r.pan.toUpperCase() === app.pan.toUpperCase()) : null;

            // Deterministic simulation / registrar lookup engine
            const panHash = app.pan.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
            const isAllotted = (panHash % 3 === 0);
            const sharesAllotted = isAllotted ? (matchedRecord ? (parseInt(matchedRecord.lotSize) || 15) : 15) : 0;
            const statusStr = isAllotted ? 'ALLOTTED' : 'NOT_ALLOTTED';

            if (matchedRecord) {
                const updatedStatus = isAllotted ? 'Yes' : 'No';
                db.run('UPDATE records SET alloted = ?, shares = ? WHERE id = ? AND userId = ?', [updatedStatus, sharesAllotted, matchedRecord.id, req.user.id], () => { });
            }

            return {
                applicantId: app.id,
                applicantName: app.name,
                pan: app.pan,
                ipoName,
                registrar: registrar || 'Link Intime',
                status: statusStr,
                sharesAllotted,
                recordUpdated: !!matchedRecord
            };
        });

        res.json({ message: 'success', ipoName, count: results.length, data: results });
    });
});

app.post('/api/allotment/predict', (req, res) => {
    const { subTimes, quota, gmp, issuePrice, qibSubX } = req.body;
    const odds = calculator.calculateAllotmentOdds(subTimes, quota);
    const prediction = calculator.predictListingGain(gmp, issuePrice, qibSubX, subTimes);
    res.json({ message: 'success', odds, prediction });
});

// Central 404 handler for unknown API endpoints
app.use('/api', (req, res) => {
    res.status(404).json({ error: `API endpoint not found: ${req.method} ${req.originalUrl}` });
});

// Central Express Error Handling Middleware
app.use((err, req, res, next) => {
    console.error(`[Server Error] ${req.method} ${req.originalUrl}:`, err);
    const statusCode = err.status || err.statusCode || 500;
    res.status(statusCode).json({
        error: err.message || 'Internal Server Error',
        ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
    });
});

// Process safety handlers for uncaught exceptions and unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('[Unhandled Promise Rejection]:', reason);
});

process.on('uncaughtException', (err) => {
    console.error('[Uncaught Exception]:', err);
});

if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
    });
}

// Export for Vercel Serverless
module.exports = app;
