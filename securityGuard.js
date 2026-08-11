const crypto = require('crypto');

const ENCRYPTION_KEY = process.env.ENCRYPTION_SECRET || '12345678901234567890123456789012'; // 32 chars
const IV_LENGTH = 16;

function encryptField(text) {
    if (!text) return text;
    try {
        const iv = crypto.randomBytes(IV_LENGTH);
        const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
        let encrypted = cipher.update(text);
        encrypted = Buffer.concat([encrypted, cipher.final()]);
        return iv.toString('hex') + ':' + encrypted.toString('hex');
    } catch (e) {
        return text;
    }
}

function decryptField(text) {
    if (!text || !text.includes(':')) return text;
    try {
        const parts = text.split(':');
        const iv = Buffer.from(parts.shift(), 'hex');
        const encryptedText = Buffer.from(parts.join(':'), 'hex');
        const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
        let decrypted = decipher.update(encryptedText);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        return decrypted.toString();
    } catch (e) {
        return text;
    }
}

function logAuditAction(db, userId, action, details, ip = '127.0.0.1') {
    const id = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString();
    const timestamp = new Date().toISOString();
    db.run(
        'INSERT INTO audit_logs (id, userId, action, details, ip, timestamp) VALUES (?, ?, ?, ?, ?, ?)',
        [id, userId, action, details, ip, timestamp],
        () => {}
    );
}

module.exports = { encryptField, decryptField, logAuditAction };
