const sqlite3 = require('sqlite3').verbose();
const { Pool } = require('pg');
const path = require('path');

const isPostgres = !!process.env.DATABASE_URL;
let pgPool;
let sqliteDb;

if (isPostgres) {
    console.log('Connecting to PostgreSQL database...');
    pgPool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
} else {
    console.log('Connecting to local SQLite database...');
    const dbPath = path.resolve(__dirname, 'database.sqlite');
    sqliteDb = new sqlite3.Database(dbPath, (err) => {
        if (err) console.error('Error opening database', err.message);
    });
}

// Helper to convert SQLite `?` params to Postgres `$1`, `$2`
function convertToPgQuery(sql) {
    let index = 1;
    return sql.replace(/\?/g, () => `$${index++}`);
}

// Convert SQLite TEXT to Postgres VARCHAR where needed
function convertToPgSchema(sql) {
    // Basic type mapping for schemas if needed, though Postgres supports TEXT just fine
    return sql.replace(/REAL/g, 'NUMERIC');
}

const db = {
    run: function(sql, params = [], callback) {
        if (typeof params === 'function') {
            callback = params;
            params = [];
        }
        
        if (isPostgres) {
            pgPool.query(convertToPgQuery(sql), params)
                .then(res => callback && callback.call({ changes: res.rowCount, lastID: res.rows?.[0]?.id }, null))
                .catch(err => {
                    // Ignore "column already exists" or similar ALTER TABLE errors gracefully on start
                    if (sql.includes('ALTER TABLE') && err.code === '42701') {
                        return callback && callback.call({ changes: 0 }, null);
                    }
                    callback && callback.call({ changes: 0 }, err);
                });
        } else {
            sqliteDb.run(sql, params, function(err) {
                callback && callback.call(this, err);
            });
        }
    },
    
    all: function(sql, params = [], callback) {
        if (typeof params === 'function') {
            callback = params;
            params = [];
        }
        
        if (isPostgres) {
            pgPool.query(convertToPgQuery(sql), params)
                .then(res => callback && callback.call(null, null, res.rows))
                .catch(err => callback && callback.call(null, err, null));
        } else {
            sqliteDb.all(sql, params, function(err, rows) {
                callback && callback.call(this, err, rows);
            });
        }
    },
    
    get: function(sql, params = [], callback) {
        if (typeof params === 'function') {
            callback = params;
            params = [];
        }
        
        if (isPostgres) {
            pgPool.query(convertToPgQuery(sql), params)
                .then(res => callback && callback.call(null, null, res.rows[0]))
                .catch(err => callback && callback.call(null, err, null));
        } else {
            sqliteDb.get(sql, params, function(err, row) {
                callback && callback.call(this, err, row);
            });
        }
    }
};

// Initialize schema
const initSchema = () => {
    // 1. Users
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE,
        password TEXT,
        email TEXT,
        createdAt TEXT,
        fcmTokens TEXT,
        role TEXT,
        status TEXT,
        subscription TEXT DEFAULT 'free',
        totpSecret TEXT,
        totpEnabled INTEGER DEFAULT 0,
        emailNotifications INTEGER DEFAULT 1,
        pushNotifications INTEGER DEFAULT 1,
        inAppNotifications INTEGER DEFAULT 1,
        gamificationEnabled INTEGER DEFAULT 0,
        telegramToken TEXT,
        telegramChatId TEXT,
        telegramAlerts INTEGER DEFAULT 0,
        appPin TEXT,
        pinEnabled INTEGER DEFAULT 0
    )`, () => {
        db.run(`ALTER TABLE users ADD COLUMN fcmTokens TEXT`, () => {});
        db.run(`ALTER TABLE users ADD COLUMN role TEXT`, () => {});
        db.run(`ALTER TABLE users ADD COLUMN status TEXT`, () => {});
        db.run(`ALTER TABLE users ADD COLUMN subscription TEXT DEFAULT 'free'`, () => {});
        db.run(`ALTER TABLE users ADD COLUMN totpSecret TEXT`, () => {});
        db.run(`ALTER TABLE users ADD COLUMN totpEnabled INTEGER DEFAULT 0`, () => {});
        db.run(`ALTER TABLE users ADD COLUMN emailNotifications INTEGER DEFAULT 1`, () => {});
        db.run(`ALTER TABLE users ADD COLUMN pushNotifications INTEGER DEFAULT 1`, () => {});
        db.run(`ALTER TABLE users ADD COLUMN inAppNotifications INTEGER DEFAULT 1`, () => {});
        db.run(`ALTER TABLE users ADD COLUMN gamificationEnabled INTEGER DEFAULT 0`, () => {});
        db.run(`ALTER TABLE users ADD COLUMN telegramToken TEXT`, () => {});
        db.run(`ALTER TABLE users ADD COLUMN telegramChatId TEXT`, () => {});
        db.run(`ALTER TABLE users ADD COLUMN telegramAlerts INTEGER DEFAULT 0`, () => {});
        db.run(`ALTER TABLE users ADD COLUMN appPin TEXT`, () => {});
        db.run(`ALTER TABLE users ADD COLUMN pinEnabled INTEGER DEFAULT 0`, () => {});
    });

    // 2. Records
    db.run(`CREATE TABLE IF NOT EXISTS records (
        id TEXT PRIMARY KEY,
        ipoName TEXT,
        applicantName TEXT,
        pan TEXT,
        upiId TEXT,
        quota TEXT,
        listingDate TEXT,
        lotSize TEXT,
        shares REAL,
        price REAL,
        listingPrice REAL,
        amount REAL,
        applied TEXT,
        alloted TEXT,
        withdrawal TEXT,
        profit REAL,
        marginPercent TEXT,
        margin REAL,
        notes TEXT,
        createdAt TEXT,
        userId TEXT,
        sellDate TEXT,
        sellPrice REAL,
        holdingStatus TEXT,
        gmp REAL,
        refundStatus TEXT DEFAULT 'pending',
        registrar TEXT,
        dematId TEXT,
        bankAccount TEXT,
        ifscCode TEXT,
        brokerage REAL DEFAULT 0,
        stt REAL DEFAULT 0,
        stampDuty REAL DEFAULT 0,
        exchangeCharges REAL DEFAULT 0,
        sebiFees REAL DEFAULT 0,
        dpCharges REAL DEFAULT 0,
        gst REAL DEFAULT 0,
        netProfit REAL DEFAULT 0,
        tags TEXT DEFAULT '[]'
    )`, () => {
        db.run(`ALTER TABLE records ADD COLUMN sellDate TEXT`, () => {});
        db.run(`ALTER TABLE records ADD COLUMN sellPrice REAL`, () => {});
        db.run(`ALTER TABLE records ADD COLUMN holdingStatus TEXT`, () => {});
        db.run(`ALTER TABLE records ADD COLUMN gmp REAL`, () => {});
        // Feature 10: Refund Tracker
        db.run(`ALTER TABLE records ADD COLUMN refundStatus TEXT DEFAULT 'pending'`, () => {});
        // Feature 5: Smart Allotment Check
        db.run(`ALTER TABLE records ADD COLUMN registrar TEXT`, () => {});
        db.run(`ALTER TABLE records ADD COLUMN dematId TEXT`, () => {});
        db.run(`ALTER TABLE records ADD COLUMN bankAccount TEXT`, () => {});
        db.run(`ALTER TABLE records ADD COLUMN ifscCode TEXT`, () => {});
        db.run(`ALTER TABLE records ADD COLUMN brokerage REAL DEFAULT 0`, () => {});
        db.run(`ALTER TABLE records ADD COLUMN stt REAL DEFAULT 0`, () => {});
        db.run(`ALTER TABLE records ADD COLUMN stampDuty REAL DEFAULT 0`, () => {});
        db.run(`ALTER TABLE records ADD COLUMN exchangeCharges REAL DEFAULT 0`, () => {});
        db.run(`ALTER TABLE records ADD COLUMN sebiFees REAL DEFAULT 0`, () => {});
        db.run(`ALTER TABLE records ADD COLUMN dpCharges REAL DEFAULT 0`, () => {});
        db.run(`ALTER TABLE records ADD COLUMN gst REAL DEFAULT 0`, () => {});
        db.run(`ALTER TABLE records ADD COLUMN netProfit REAL DEFAULT 0`, () => {});
        db.run(`ALTER TABLE records ADD COLUMN tags TEXT DEFAULT '[]'`, () => {});
    });

    // 3. Applicants
    db.run(`CREATE TABLE IF NOT EXISTS applicants (
        id TEXT PRIMARY KEY,
        name TEXT,
        pan TEXT,
        upiId TEXT,
        createdAt TEXT,
        userId TEXT,
        family TEXT,
        dematId TEXT,
        bankAccount TEXT,
        ifscCode TEXT,
        commissionPct REAL DEFAULT 0
    )`, () => {
        db.run(`ALTER TABLE applicants ADD COLUMN family TEXT`, () => {});
        db.run(`ALTER TABLE applicants ADD COLUMN dematId TEXT`, () => {});
        db.run(`ALTER TABLE applicants ADD COLUMN bankAccount TEXT`, () => {});
        db.run(`ALTER TABLE applicants ADD COLUMN ifscCode TEXT`, () => {});
        db.run(`ALTER TABLE applicants ADD COLUMN commissionPct REAL DEFAULT 0`, () => {});
    });
    
    // 4. Notifications
    db.run(`CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        title TEXT,
        body TEXT,
        userId TEXT,
        sentAt TEXT,
        status TEXT DEFAULT 'unread',
        error TEXT
    )`, () => {
        db.run(`ALTER TABLE notifications ADD COLUMN status TEXT DEFAULT 'unread'`, () => {});
    });

    // 5. Settings
    db.run(`CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
    )`);

    // 6. Audit Logs
    db.run(`CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        adminId TEXT,
        adminUsername TEXT,
        action TEXT,
        target TEXT,
        details TEXT,
        createdAt TEXT
    )`, () => {
        // Migrate existing tables that may have old column names
        db.run(`ALTER TABLE audit_logs ADD COLUMN adminId TEXT`, () => {});
        db.run(`ALTER TABLE audit_logs ADD COLUMN adminUsername TEXT`, () => {});
        db.run(`ALTER TABLE audit_logs ADD COLUMN target TEXT`, () => {});
        db.run(`ALTER TABLE audit_logs ADD COLUMN createdAt TEXT`, () => {});
    });

    // 7. Email Templates
    db.run(`CREATE TABLE IF NOT EXISTS email_templates (
        id TEXT PRIMARY KEY,
        name TEXT,
        subject TEXT,
        bodyHtml TEXT,
        createdAt TEXT,
        updatedAt TEXT
    )`);

    // 8. Notifications Log
    db.run(`CREATE TABLE IF NOT EXISTS notifications_log (
        id TEXT PRIMARY KEY,
        title TEXT,
        body TEXT,
        sentAt TEXT,
        recipientCount INTEGER,
        status TEXT,
        type TEXT
    )`);

    // 9. Active Sessions Table
    // 10. GMP Alerts
    db.run(`CREATE TABLE IF NOT EXISTS gmp_alerts (
        id TEXT PRIMARY KEY,
        userId TEXT,
        ipoName TEXT,
        targetGmp REAL,
        direction TEXT DEFAULT 'above',
        triggered INTEGER DEFAULT 0,
        createdAt TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        userId TEXT,
        deviceAgent TEXT,
        ipAddress TEXT,
        createdAt TEXT,
        lastActiveAt TEXT,
        token TEXT
    )`);
};

// Wait slightly for connection to establish before schema init
setTimeout(initSchema, 500);

module.exports = db;
