const https = require('https');
const http = require('http');

/**
 * Send WhatsApp notification message
 * Supports Meta Graph API / UltraMsg / Custom Webhook Gateway
 */
async function sendWhatsAppMessage(phone, text, customWebhookUrl = null) {
    if (!phone || !text) return { success: false, error: 'Phone and text are required' };

    const targetUrl = customWebhookUrl || process.env.WHATSAPP_WEBHOOK_URL;
    if (!targetUrl) {
        console.log(`[WhatsApp Simulated] To: ${phone} | Body: ${text}`);
        return { success: true, mode: 'simulated' };
    }

    try {
        const payload = JSON.stringify({
            to: phone.replace(/[^\d+]/g, ''),
            message: text,
            timestamp: new Date().toISOString()
        });

        const urlObj = new URL(targetUrl);
        const protocol = urlObj.protocol === 'https:' ? https : http;

        return new Promise((resolve, reject) => {
            const req = protocol.request(targetUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(payload)
                }
            }, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve({ success: true, data });
                    } else {
                        resolve({ success: false, status: res.statusCode, error: data });
                    }
                });
            });

            req.on('error', (err) => resolve({ success: false, error: err.message }));
            req.write(payload);
            req.end();
        });
    } catch (err) {
        console.error('WhatsApp send error:', err.message);
        return { success: false, error: err.message };
    }
}

module.exports = { sendWhatsAppMessage };
