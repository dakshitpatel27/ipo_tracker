const fs = require('fs');
const path = require('path');
const db = require('./db');

const dataPath = path.resolve(__dirname, 'import_data.json');

fs.readFile(dataPath, 'utf8', (err, data) => {
    if (err) {
        console.error('Error reading import_data.json', err);
        return;
    }

    try {
        const jsonData = JSON.parse(data);
        const records = jsonData.records || [];
        
        if (records.length === 0) {
            console.log('No records found in import_data.json');
            return;
        }

        console.log(`Found ${records.length} records. Beginning migration...`);
        
        const sql = `INSERT OR IGNORE INTO records (
            id, ipoName, applicantName, pan, upiId, quota, listingDate, 
            lotSize, shares, price, listingPrice, amount, applied, 
            alloted, withdrawal, profit, marginPercent, margin, notes, createdAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

        db.serialize(() => {
            const stmt = db.prepare(sql);
            let count = 0;

            records.forEach(r => {
                const params = [
                    r.id, r.ipoName, r.applicantName, r.pan, r.upiId, r.quota, r.listingDate, 
                    r.lotSize, r.shares, r.price, r.listingPrice, r.amount, r.applied, 
                    r.alloted, r.withdrawal, r.profit, r.marginPercent, r.margin, r.notes, r.createdAt
                ];
                stmt.run(params, (err) => {
                    if (err) {
                        console.error(`Error inserting record ${r.id}:`, err.message);
                    } else {
                        count++;
                    }
                });
            });

            stmt.finalize(() => {
                console.log(`Migration completed. Attempted to insert ${records.length} records. Successfully queued ${count} inserts.`);
            });
        });
    } catch (parseErr) {
        console.error('Error parsing JSON:', parseErr);
    }
});
