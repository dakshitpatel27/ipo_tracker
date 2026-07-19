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
                .then(res => callback && callback.call(null, null))
                .catch(err => {
                    // Ignore "column already exists" or similar ALTER TABLE errors gracefully on start
                    if (sql.includes('ALTER TABLE') && err.code === '42701') {
                        return callback && callback.call(null, null);
                    }
                    callback && callback.call(null, err);
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
        subscription TEXT DEFAULT 'free'
    )`, () => {
        // Fallback for migrations (won't run on fresh install)
        db.run(`ALTER TABLE users ADD COLUMN fcmTokens TEXT`, () => {});
        db.run(`ALTER TABLE users ADD COLUMN role TEXT`, (err) => {
            if (!err) db.run(`UPDATE users SET role = 'admin', status = 'approved'`);
        });
        db.run(`ALTER TABLE users ADD COLUMN status TEXT`, () => {});
        db.run(`ALTER TABLE users ADD COLUMN subscription TEXT DEFAULT 'free'`, () => {});
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
        gmp REAL
    )`, () => {
        db.run(`ALTER TABLE records ADD COLUMN sellDate TEXT`, () => {});
        db.run(`ALTER TABLE records ADD COLUMN sellPrice REAL`, () => {});
        db.run(`ALTER TABLE records ADD COLUMN holdingStatus TEXT`, () => {});
        db.run(`ALTER TABLE records ADD COLUMN gmp REAL`, () => {});
    });

    // 3. Applicants
    db.run(`CREATE TABLE IF NOT EXISTS applicants (
        id TEXT PRIMARY KEY,
        name TEXT,
        pan TEXT,
        upiId TEXT,
        createdAt TEXT,
        userId TEXT,
        family TEXT
    )`, () => {
        db.run(`ALTER TABLE applicants ADD COLUMN family TEXT`, () => {});
    });
    
    // 4. Notifications
    db.run(`CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        title TEXT,
        body TEXT,
        userId TEXT,
        sentAt TEXT,
        status TEXT,
        error TEXT
    )`);

    // 5. Settings
    db.run(`CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
    )`);

    // 6. Audit Logs
    db.run(`CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        userId TEXT,
        username TEXT,
        action TEXT,
        details TEXT,
        timestamp TEXT
    )`);

    // 7. Email Templates
    db.run(`CREATE TABLE IF NOT EXISTS email_templates (
        id TEXT PRIMARY KEY,
        name TEXT,
        subject TEXT,
        bodyHtml TEXT,
        createdAt TEXT,
        updatedAt TEXT
    )`);
};

// Wait slightly for connection to establish before schema init
setTimeout(initSchema, 500);

module.exports = db;
