const db = require('./db');
const { v4: uuidv4 } = require('uuid'); // Need to install uuid if not already, wait, frontend uses uuid, backend might not have it. Let's use crypto.randomUUID or simple fallback.
const crypto = require('crypto');

function generateId() {
    return crypto.randomUUID ? crypto.randomUUID() : Date.now().toString();
}

console.log('Starting migration of applicants...');

db.serialize(() => {
    db.all('SELECT DISTINCT applicantName, pan, upiId FROM records WHERE applicantName IS NOT NULL AND applicantName != ""', [], (err, rows) => {
        if (err) {
            console.error('Error fetching unique applicants:', err.message);
            return;
        }

        console.log(`Found ${rows.length} unique applicants. Starting insertion...`);

        const insertStmt = db.prepare('INSERT OR IGNORE INTO applicants (id, name, pan, upiId, createdAt) VALUES (?, ?, ?, ?, ?)');

        let count = 0;
        rows.forEach(row => {
            const id = generateId();
            const createdAt = new Date().toISOString();
            insertStmt.run([id, row.applicantName, row.pan || '', row.upiId || '', createdAt], function(err) {
                if (!err && this.changes > 0) {
                    count++;
                }
            });
        });

        insertStmt.finalize(() => {
            console.log(`Migration complete. Inserted ${count} new applicants.`);
        });
    });
});
