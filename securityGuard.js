const crypto = require('crypto');

const rawKey = process.env.ENCRYPTION_SECRET || 'default_fallback_secret_key_32b';
if (!process.env.ENCRYPTION_SECRET) {
    console.warn('[SECURITY WARNING] ENCRYPTION_SECRET environment variable is not set! Using fallback encryption key.');
}
const ENCRYPTION_KEY = crypto.createHash('sha256').update(rawKey).digest(); // Exactly 32 bytes
const IV_LENGTH = 16;

function encryptField(text) {
    if (!text) return text;
    try {
        const iv = crypto.randomBytes(IV_LENGTH);
        const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
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
        const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
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
