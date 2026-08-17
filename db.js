let sqlite3;
try {
    sqlite3 = require('sqlite3').verbose();
} catch (e) {
    console.warn('[DB WARNING] sqlite3 native module failed to load:', e.message);
}

const { Pool } = require('pg');
const path = require('path');

const isPostgres = !!process.env.DATABASE_URL;
let pgPool;
let sqliteDb;

if (isPostgres) {
    console.log('Connecting to PostgreSQL database via DATABASE_URL...');
    try {
        pgPool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: process.env.DATABASE_URL.includes('localhost') || process.env.DATABASE_URL.includes('127.0.0.1') ? false : { rejectUnauthorized: false },
            connectionTimeoutMillis: 10000,
        });
        pgPool.on('error', (err) => {
            console.error('[PostgreSQL Pool Error]:', err.message);
        });
    } catch (e) {
        console.error('[PostgreSQL Init Error]:', e.message);
    }
} else if (sqlite3) {
    console.log('Connecting to local SQLite database...');
    const fs = require('fs');
    let dbPath = path.resolve(__dirname, 'database.sqlite');

    if (process.env.VERCEL) {
        const tmpDbPath = path.join('/tmp', 'database.sqlite');
        if (!fs.existsSync(tmpDbPath) && fs.existsSync(dbPath)) {
            try {
                fs.copyFileSync(dbPath, tmpDbPath);
            } catch (e) {
                console.error('Failed to copy database to /tmp:', e);
            }
        }
        if (fs.existsSync(tmpDbPath)) {
            dbPath = tmpDbPath;
        }
    }

    try {
        sqliteDb = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
            if (err) console.error('Error opening database', err.message);
        });
    } catch (err) {
        console.error('Failed to initialize SQLite database instance:', err.message);
    }
} else {
    console.warn('[DB WARNING] Neither DATABASE_URL nor sqlite3 native driver is active.');
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
    run: function (sql, params = [], callback) {
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
        } else if (sqliteDb) {
            sqliteDb.run(sql, params, function (err) {
                callback && callback.call(this, err);
            });
        } else {
            console.error('[DB Error] No database connection available for SQL:', sql);
            callback && callback.call({ changes: 0 }, new Error('Database connection unavailable on Vercel. Please add a DATABASE_URL environment variable in Vercel.'));
        }
    },

    all: function (sql, params = [], callback) {
        if (typeof params === 'function') {
            callback = params;
            params = [];
        }

        if (isPostgres) {
            pgPool.query(convertToPgQuery(sql), params)
                .then(res => callback && callback.call(null, null, res.rows))
                .catch(err => callback && callback.call(null, err, null));
        } else if (sqliteDb) {
            sqliteDb.all(sql, params, function (err, rows) {
                callback && callback.call(this, err, rows);
            });
        } else {
            console.error('[DB Error] No database connection available for SQL:', sql);
            callback && callback.call(null, new Error('Database connection unavailable on Vercel. Please add a DATABASE_URL environment variable in Vercel.'), []);
        }
    },

    get: function (sql, params = [], callback) {
        if (typeof params === 'function') {
            callback = params;
            params = [];
        }

        if (isPostgres) {
            pgPool.query(convertToPgQuery(sql), params)
                .then(res => callback && callback.call(null, null, res.rows[0]))
                .catch(err => callback && callback.call(null, err, null));
        } else if (sqliteDb) {
            sqliteDb.get(sql, params, function (err, row) {
                callback && callback.call(this, err, row);
            });
        } else {
            console.error('[DB Error] No database connection available for SQL:', sql);
            callback && callback.call(null, new Error('Database connection unavailable on Vercel. Please add a DATABASE_URL environment variable in Vercel.'), null);
        }
    },

    getColumns: function (tableName, callback) {
        const cleanTable = tableName.replace(/[^a-zA-Z0-9_]/g, '');
        if (isPostgres) {
            const query = `SELECT column_name FROM information_schema.columns WHERE table_name = $1`;
            pgPool.query(query, [cleanTable])
                .then(res => {
                    const cols = res.rows.map(r => r.column_name);
                    callback && callback(null, cols);
                })
                .catch(err => callback && callback(err, null));
        } else {
            const query = `PRAGMA table_info(${cleanTable})`;
            sqliteDb.all(query, [], (err, rows) => {
                if (err) return callback && callback(err, null);
                const cols = (rows || []).map(r => r.name);
                callback && callback(null, cols);
            });
        }
    },

    addColumn: function (tableName, columnName, columnType, callback) {
        if (typeof columnType === 'function') {
            callback = columnType;
            columnType = 'TEXT';
        }
        const cleanTable = tableName.replace(/[^a-zA-Z0-9_]/g, '');
        const cleanCol = columnName.replace(/[^a-zA-Z0-9_]/g, '');
        const type = (columnType || 'TEXT').toUpperCase() === 'REAL' || (columnType || 'TEXT').toUpperCase() === 'NUMERIC' ? (isPostgres ? 'NUMERIC' : 'REAL') : 'TEXT';

        this.getColumns(cleanTable, (err, existingCols) => {
            if (err) return callback && callback(err);
            const lowerCols = (existingCols || []).map(c => c.toLowerCase());
            if (lowerCols.includes(cleanCol.toLowerCase())) {
                // Column already exists
                return callback && callback(null, { alreadyExists: true, column: cleanCol });
            }

            const alterSql = `ALTER TABLE ${cleanTable} ADD COLUMN ${cleanCol} ${type}`;
            this.run(alterSql, [], (alterErr) => {
                if (alterErr && !alterErr.message?.includes('duplicate column') && alterErr.code !== '42701') {
                    return callback && callback(alterErr);
                }
                callback && callback(null, { added: true, column: cleanCol, type });
            });
        });
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
        name TEXT,
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
        pinEnabled INTEGER DEFAULT 0,
        whatsappNumber TEXT,
        whatsappAlerts INTEGER DEFAULT 0,
        webauthnKey TEXT,
        ipWhiteList TEXT,
        advanceTaxEst REAL DEFAULT 0,
        biometricEnabled INTEGER DEFAULT 0,
        themeAccent TEXT DEFAULT 'emerald'
    )`, () => {
        db.run(`ALTER TABLE users ADD COLUMN name TEXT`, () => { });
        db.run(`ALTER TABLE users ADD COLUMN fcmTokens TEXT`, () => { });
        db.run(`ALTER TABLE users ADD COLUMN role TEXT`, () => { });
        db.run(`ALTER TABLE users ADD COLUMN status TEXT`, () => { });
        db.run(`ALTER TABLE users ADD COLUMN subscription TEXT DEFAULT 'free'`, () => { });
        db.run(`ALTER TABLE users ADD COLUMN totpSecret TEXT`, () => { });
        db.run(`ALTER TABLE users ADD COLUMN totpEnabled INTEGER DEFAULT 0`, () => { });
        db.run(`ALTER TABLE users ADD COLUMN emailNotifications INTEGER DEFAULT 1`, () => { });
        db.run(`ALTER TABLE users ADD COLUMN pushNotifications INTEGER DEFAULT 1`, () => { });
        db.run(`ALTER TABLE users ADD COLUMN inAppNotifications INTEGER DEFAULT 1`, () => { });
        db.run(`ALTER TABLE users ADD COLUMN gamificationEnabled INTEGER DEFAULT 0`, () => { });
        db.run(`ALTER TABLE users ADD COLUMN telegramToken TEXT`, () => { });
        db.run(`ALTER TABLE users ADD COLUMN telegramChatId TEXT`, () => { });
        db.run(`ALTER TABLE users ADD COLUMN telegramAlerts INTEGER DEFAULT 0`, () => { });
        db.run(`ALTER TABLE users ADD COLUMN appPin TEXT`, () => { });
        db.run(`ALTER TABLE users ADD COLUMN pinEnabled INTEGER DEFAULT 0`, () => { });
        db.run(`ALTER TABLE users ADD COLUMN whatsappNumber TEXT`, () => { });
        db.run(`ALTER TABLE users ADD COLUMN whatsappAlerts INTEGER DEFAULT 0`, () => { });
        db.run(`ALTER TABLE users ADD COLUMN webauthnKey TEXT`, () => { });
        db.run(`ALTER TABLE users ADD COLUMN ipWhiteList TEXT`, () => { });
        db.run(`ALTER TABLE users ADD COLUMN advanceTaxEst REAL DEFAULT 0`, () => { });
        db.run(`ALTER TABLE users ADD COLUMN biometricEnabled INTEGER DEFAULT 0`, () => { });
        db.run(`ALTER TABLE users ADD COLUMN themeAccent TEXT DEFAULT 'emerald'`, () => { });
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
        tags TEXT DEFAULT '[]',
        bankName TEXT,
        mandateStatus TEXT DEFAULT 'Requested',
        mandateUpiId TEXT,
        sector TEXT,
        peRatio REAL,
        gmpTrend TEXT,
        anchorLockupDays INTEGER,
        kostakPrice REAL,
        saudaPrice REAL,
        preOpenPrice REAL,
        targetPrice REAL,
        stopLoss REAL,
        aisStatus TEXT DEFAULT 'Verified'
    )`, () => {
        db.run(`ALTER TABLE records ADD COLUMN sellDate TEXT`, () => { });
        db.run(`ALTER TABLE records ADD COLUMN sellPrice REAL`, () => { });
        db.run(`ALTER TABLE records ADD COLUMN holdingStatus TEXT`, () => { });
        db.run(`ALTER TABLE records ADD COLUMN gmp REAL`, () => { });
        db.run(`ALTER TABLE records ADD COLUMN refundStatus TEXT DEFAULT 'pending'`, () => { });
        db.run(`ALTER TABLE records ADD COLUMN registrar TEXT`, () => { });
        db.run(`ALTER TABLE records ADD COLUMN dematId TEXT`, () => { });
        db.run(`ALTER TABLE records ADD COLUMN bankAccount TEXT`, () => { });
        db.run(`ALTER TABLE records ADD COLUMN ifscCode TEXT`, () => { });
        db.run(`ALTER TABLE records ADD COLUMN brokerage REAL DEFAULT 0`, () => { });
        db.run(`ALTER TABLE records ADD COLUMN stt REAL DEFAULT 0`, () => { });
        db.run(`ALTER TABLE records ADD COLUMN stampDuty REAL DEFAULT 0`, () => { });
        db.run(`ALTER TABLE records ADD COLUMN exchangeCharges REAL DEFAULT 0`, () => { });
        db.run(`ALTER TABLE records ADD COLUMN sebiFees REAL DEFAULT 0`, () => { });
        db.run(`ALTER TABLE records ADD COLUMN dpCharges REAL DEFAULT 0`, () => { });
        db.run(`ALTER TABLE records ADD COLUMN gst REAL DEFAULT 0`, () => { });
        db.run(`ALTER TABLE records ADD COLUMN netProfit REAL DEFAULT 0`, () => { });
        db.run(`ALTER TABLE records ADD COLUMN tags TEXT DEFAULT '[]'`, () => { });
        db.run(`ALTER TABLE records ADD COLUMN bankName TEXT`, () => { });
        db.run(`ALTER TABLE records ADD COLUMN mandateStatus TEXT DEFAULT 'Requested'`, () => { });
        db.run(`ALTER TABLE records ADD COLUMN mandateUpiId TEXT`, () => { });
        db.run(`ALTER TABLE records ADD COLUMN sector TEXT`, () => { });
        db.run(`ALTER TABLE records ADD COLUMN peRatio REAL`, () => { });
        db.run(`ALTER TABLE records ADD COLUMN gmpTrend TEXT`, () => { });
        db.run(`ALTER TABLE records ADD COLUMN anchorLockupDays INTEGER`, () => { });
        db.run(`ALTER TABLE records ADD COLUMN kostakPrice REAL`, () => { });
        db.run(`ALTER TABLE records ADD COLUMN saudaPrice REAL`, () => { });
        db.run(`ALTER TABLE records ADD COLUMN preOpenPrice REAL`, () => { });
        db.run(`ALTER TABLE records ADD COLUMN targetPrice REAL`, () => { });
        db.run(`ALTER TABLE records ADD COLUMN stopLoss REAL`, () => { });
        db.run(`ALTER TABLE records ADD COLUMN aisStatus TEXT DEFAULT 'Verified'`, () => { });
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
        commissionPct REAL DEFAULT 0,
        kycExpiry TEXT,
        bankBalance REAL DEFAULT 0,
        priorityOrder INTEGER DEFAULT 1,
        groupTag TEXT DEFAULT 'Family'
    )`, () => {
        db.run(`ALTER TABLE applicants ADD COLUMN family TEXT`, () => { });
        db.run(`ALTER TABLE applicants ADD COLUMN dematId TEXT`, () => { });
        db.run(`ALTER TABLE applicants ADD COLUMN bankAccount TEXT`, () => { });
        db.run(`ALTER TABLE applicants ADD COLUMN ifscCode TEXT`, () => { });
        db.run(`ALTER TABLE applicants ADD COLUMN commissionPct REAL DEFAULT 0`, () => { });
        db.run(`ALTER TABLE applicants ADD COLUMN kycExpiry TEXT`, () => { });
        db.run(`ALTER TABLE applicants ADD COLUMN bankBalance REAL DEFAULT 0`, () => { });
        db.run(`ALTER TABLE applicants ADD COLUMN priorityOrder INTEGER DEFAULT 1`, () => { });
        db.run(`ALTER TABLE applicants ADD COLUMN groupTag TEXT DEFAULT 'Family'`, () => { });
    });

    // 4. Journal Entries
    db.run(`CREATE TABLE IF NOT EXISTS journal_entries (
        id TEXT PRIMARY KEY,
        recordId TEXT,
        userId TEXT,
        notes TEXT,
        rating INTEGER DEFAULT 5,
        tags TEXT DEFAULT '[]',
        createdAt TEXT
    )`);

    // 5. Notifications
    db.run(`CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        title TEXT,
        body TEXT,
        userId TEXT,
        sentAt TEXT,
        status TEXT DEFAULT 'unread',
        error TEXT
    )`, () => {
        db.run(`ALTER TABLE notifications ADD COLUMN status TEXT DEFAULT 'unread'`, () => { });
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
        db.run(`ALTER TABLE audit_logs ADD COLUMN adminId TEXT`, () => { });
        db.run(`ALTER TABLE audit_logs ADD COLUMN adminUsername TEXT`, () => { });
        db.run(`ALTER TABLE audit_logs ADD COLUMN target TEXT`, () => { });
        db.run(`ALTER TABLE audit_logs ADD COLUMN createdAt TEXT`, () => { });
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
    )`, () => {
        db.run(`ALTER TABLE notifications_log ADD COLUMN userId TEXT`, () => { });
        db.run(`ALTER TABLE notifications_log ADD COLUMN username TEXT`, () => { });
        db.run(`ALTER TABLE notifications_log ADD COLUMN email TEXT`, () => { });
        db.run(`ALTER TABLE notifications_log ADD COLUMN channel TEXT DEFAULT 'push'`, () => { });
        db.run(`ALTER TABLE notifications_log ADD COLUMN error TEXT`, () => { });
    });

    // 8b. FCM Tokens Master Table
    db.run(`CREATE TABLE IF NOT EXISTS fcm_tokens (
        id TEXT PRIMARY KEY,
        userId TEXT,
        username TEXT,
        email TEXT,
        token TEXT UNIQUE,
        deviceType TEXT DEFAULT 'web',
        createdAt TEXT,
        lastUsedAt TEXT
    )`, () => {
        db.run(`ALTER TABLE fcm_tokens ADD COLUMN username TEXT`, () => { });
        db.run(`ALTER TABLE fcm_tokens ADD COLUMN email TEXT`, () => { });
        db.run(`ALTER TABLE fcm_tokens ADD COLUMN deviceType TEXT DEFAULT 'web'`, () => { });
        db.run(`ALTER TABLE fcm_tokens ADD COLUMN lastUsedAt TEXT`, () => { });
    });

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

    // 11. Bank Accounts (Expense Tracker)
    db.run(`CREATE TABLE IF NOT EXISTS bank_accounts (
        id TEXT PRIMARY KEY,
        userId TEXT,
        accountName TEXT,
        bankName TEXT,
        accountNumber TEXT,
        ifscCode TEXT,
        accountType TEXT DEFAULT 'Savings',
        balance REAL DEFAULT 0,
        color TEXT DEFAULT '#6366f1',
        createdAt TEXT
    )`);

    // 12. Transactions (Passbook Ledger)
    db.run(`CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        userId TEXT,
        bankAccountId TEXT,
        type TEXT,
        category TEXT,
        amount REAL DEFAULT 0,
        runningBalance REAL DEFAULT 0,
        description TEXT,
        referenceId TEXT,
        date TEXT,
        createdAt TEXT
    )`);

    // Add bankAccountId to records table if not exists
    db.run(`ALTER TABLE records ADD COLUMN bankAccountId TEXT`, () => { });

    // 13. Party Ledger (Khatabook Credit/Debit)
    db.run(`CREATE TABLE IF NOT EXISTS party_ledger (
        id TEXT PRIMARY KEY,
        userId TEXT,
        applicantId TEXT,
        recordId TEXT,
        type TEXT,
        category TEXT DEFAULT 'MANUAL',
        amount REAL DEFAULT 0,
        note TEXT,
        paymentMode TEXT DEFAULT 'UPI',
        date TEXT,
        createdAt TEXT
    )`);

    // 14. Expenses (Expense Tracker)
    db.run(`CREATE TABLE IF NOT EXISTS expenses (
        id TEXT PRIMARY KEY,
        userId TEXT,
        bankAccountId TEXT,
        amount REAL DEFAULT 0,
        category TEXT,
        subcategory TEXT,
        description TEXT,
        paymentMode TEXT DEFAULT 'UPI',
        date TEXT,
        isRecurring INTEGER DEFAULT 0,
        tags TEXT DEFAULT '[]',
        receipt TEXT,
        createdAt TEXT
    )`);

    // 15. Budgets (Monthly budget limits per category)
    db.run(`CREATE TABLE IF NOT EXISTS budgets (
        id TEXT PRIMARY KEY,
        userId TEXT,
        category TEXT,
        monthlyLimit REAL DEFAULT 0,
        createdAt TEXT
    )`);

    // 16. Import History (Audit log & rollback tracking)
    db.run(`CREATE TABLE IF NOT EXISTS import_history (
        id TEXT PRIMARY KEY,
        userId TEXT,
        tableName TEXT,
        fileName TEXT,
        importedCount INTEGER DEFAULT 0,
        addedColumns TEXT DEFAULT '[]',
        importedRecordIds TEXT DEFAULT '[]',
        status TEXT DEFAULT 'success',
        createdAt TEXT
    )`);

    // 17. Custom Field Metadata (Dynamic schema column manager)
    db.run(`CREATE TABLE IF NOT EXISTS custom_field_metadata (
        id TEXT PRIMARY KEY,
        userId TEXT,
        tableName TEXT,
        columnName TEXT,
        label TEXT,
        dataType TEXT DEFAULT 'TEXT',
        isVisible INTEGER DEFAULT 1,
        createdAt TEXT
    )`);

    // 18. Kostak Deals & Subject-to-Sauda Ledger
    db.run(`CREATE TABLE IF NOT EXISTS kostak_deals (
        id TEXT PRIMARY KEY,
        userId TEXT,
        ipoName TEXT,
        applicantName TEXT,
        lotCount INTEGER DEFAULT 1,
        ratePerLot REAL DEFAULT 0,
        totalAmount REAL DEFAULT 0,
        dealType TEXT DEFAULT 'KOSTAK',
        status TEXT DEFAULT 'ACTIVE',
        createdAt TEXT
    )`);\n
    // 19. Watchlist (Feature 1)
    db.run(`CREATE TABLE IF NOT EXISTS watchlist (
        id TEXT PRIMARY KEY,
        userId TEXT,
        ipoName TEXT,
        ipoId TEXT,
        priceBand TEXT,
        openDate TEXT,
        closeDate TEXT,
        listingDate TEXT,
        alertGmpAbove REAL,
        alertGmpBelow REAL,
        alertOnAllotment INTEGER DEFAULT 0,
        alertOnListing INTEGER DEFAULT 0,
        isActive INTEGER DEFAULT 1,
        createdAt TEXT
    )`);

    // 20. User Notifications Inbox (Feature 7)
    db.run(`CREATE TABLE IF NOT EXISTS user_notifications (
        id TEXT PRIMARY KEY,
        userId TEXT,
        title TEXT,
        body TEXT,
        type TEXT DEFAULT 'system',
        isRead INTEGER DEFAULT 0,
        createdAt TEXT
    )`);

    // Add preferences column to users for dashboard layout, theme, etc.
    db.run(`ALTER TABLE users ADD COLUMN preferences TEXT`, () => { });

    // Add importBatchId column to records for undo support
    db.run(`ALTER TABLE records ADD COLUMN importBatchId TEXT`, () => { });

    // Add source column to import_history
    db.run(`ALTER TABLE import_history ADD COLUMN source TEXT`, () => { });
};
// Initialize schema
initSchema();
setTimeout(initSchema, 500);

module.exports = db;
