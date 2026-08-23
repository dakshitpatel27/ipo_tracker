const db = require('./db');

/**
 * Interactive Bot Command Engine for Telegram & WhatsApp
 */

async function processBotMessage({ text = '', chatId = '', senderPhone = '', channel = 'telegram' }) {
    const cleanText = (text || '').trim();
    const [commandRaw, ...args] = cleanText.split(/\s+/);
    const command = commandRaw ? commandRaw.toLowerCase().replace('@', '').split('/')[1] || commandRaw.toLowerCase() : 'help';

    // 1. Handle account linking command `/link 123456`
    if (command === 'link') {
        const pin = args[0];
        if (!pin) {
            return {
                text: "⚠️ <b>Missing Sync Code</b>\n\nUsage: <code>/link 123456</code>\n\nGenerate your 6-digit Sync Code from <b>Settings > Telegram & WhatsApp Alert Bot</b> on the IPO Tracker app."
            };
        }

        return new Promise((resolve) => {
            db.get(
                'SELECT id, username FROM users WHERE botSyncPin = ? AND botSyncExpires > ?',
                [pin, new Date().toISOString()],
                (err, user) => {
                    if (err || !user) {
                        return resolve({
                            text: "❌ <b>Invalid or Expired Sync Code</b>\n\nPlease generate a new 6-digit Sync Code from Settings in your IPO Tracker dashboard."
                        });
                    }

                    // Pair chat ID or phone number
                    if (channel === 'telegram') {
                        db.run(
                            'UPDATE users SET telegramChatId = ?, telegramAlerts = 1, botSyncPin = NULL WHERE id = ?',
                            [chatId, user.id],
                            (updateErr) => {
                                if (updateErr) return resolve({ text: "❌ Failed to pair account." });
                                resolve({
                                    text: `🎉 <b>Account Linked Successfully!</b>\n\nHello <b>${user.username}</b>, your Telegram account is now connected to IPO Tracker.\n\nYou can now use:\n• <code>/gmp</code> - Live GMP Trends\n• <code>/status</code> - Check Allotments\n• <code>/bids</code> - Applied Bids Summary\n• <code>/digest</code> - Today's IPO Calendar`
                                });
                            }
                        );
                    } else {
                        const cleanPhone = senderPhone.replace(/[^\d+]/g, '');
                        db.run(
                            'UPDATE users SET whatsappNumber = ?, whatsappAlerts = 1, botSyncPin = NULL WHERE id = ?',
                            [cleanPhone, user.id],
                            (updateErr) => {
                                if (updateErr) return resolve({ text: "❌ Failed to pair account." });
                                resolve({
                                    text: `🎉 *Account Linked Successfully!*\n\nHello *${user.username}*, your WhatsApp number is now connected to IPO Tracker.\n\nType *gmp*, *status*, or *bids* to get started!`
                                });
                            }
                        );
                    }
                }
            );
        });
    }

    // 2. Identify linked user by ChatId or Phone
    const user = await new Promise((resolve) => {
        if (channel === 'telegram' && chatId) {
            db.get('SELECT * FROM users WHERE telegramChatId = ?', [chatId], (err, row) => resolve(row));
        } else if (senderPhone) {
            const cleanPhone = senderPhone.replace(/[^\d+]/g, '');
            db.get('SELECT * FROM users WHERE whatsappNumber LIKE ?', [`%${cleanPhone}%`], (err, row) => resolve(row));
        } else {
            resolve(null);
        }
    });

    // Handle /start, /help or unlinked prompt
    if (command === 'start' || command === 'help' || command === 'menu' || !command) {
        if (!user) {
            return {
                text: `🚀 <b>Welcome to IPO Tracker Bot!</b>\n\nTo link your account, enter your 6-digit Sync PIN:\n<code>/link YOUR_PIN</code>\n\n(Generate your PIN under Settings > Telegram Alert Bot in IPO Tracker)`
            };
        }

        return {
            text: `📈 <b>IPO Tracker Command Center</b>\n\nHi <b>${user.username}</b>! Here are your available commands:\n\n• <code>/gmp</code> - Live Grey Market Premium (GMP)\n• <code>/status</code> - Check Allotment status across accounts\n• <code>/bids</code> - View active IPO applications\n• <code>/digest</code> - Daily market events & calendar\n• <code>/help</code> - Show this menu`
        };
    }

    // 3. Command `/gmp` - Live GMP query
    if (command === 'gmp') {
        try {
            const res = await fetch('https://finapi.upvaly.com/api/ipo');
            const json = await res.json();
            if (json.status === 'success' && Array.isArray(json.data) && json.data.length > 0) {
                let msg = `📊 <b>Live Grey Market Premium (GMP)</b>\n\n`;
                json.data.slice(0, 10).forEach(ipo => {
                    const gmp = ipo.greyMarketPremium?.gmpTrends?.[0]?.gmp || 'N/A';
                    const price = ipo.priceBand || 'N/A';
                    msg += `• <b>${ipo.name}</b>\n  Price: ₹${price} | <b>GMP: ${gmp}</b>\n\n`;
                });
                return { text: msg };
            }
        } catch (e) {
            console.error('[Bot Engine GMP Error]:', e.message);
        }
        return { text: "⚠️ Unable to fetch live GMP right now. Please try again shortly." };
    }

    // Unlinked user restriction for personal portfolio queries
    if (!user) {
        return {
            text: "⚠️ <b>Account Not Linked</b>\n\nPlease pair your account first using: <code>/link YOUR_PIN</code>"
        };
    }

    // 4. Command `/status` or `/allotment`
    if (command === 'status' || command === 'allotment') {
        return new Promise((resolve) => {
            db.all(
                "SELECT ipoName, applicantName, pan, alloted, shares, amount FROM records WHERE userId = ? ORDER BY createdAt DESC LIMIT 10",
                [user.id],
                (err, rows) => {
                    if (err || !rows || rows.length === 0) {
                        return resolve({ text: "ℹ️ No recent application records found in your portfolio." });
                    }

                    let msg = `🎯 <b>Recent Allotment Status (${rows.length})</b>\n\n`;
                    rows.forEach(r => {
                        const statusBadge = r.alloted === 'Allotted' || r.alloted === 'Yes'
                            ? '🎉 ALLOTTED'
                            : r.alloted === 'Not Allotted' || r.alloted === 'No'
                                ? '❌ Not Allotted'
                                : '⏳ Pending';
                        msg += `• <b>${r.ipoName}</b> (${r.applicantName})\n  Status: <b>${statusBadge}</b> | ${r.shares || 1} shares\n\n`;
                    });
                    resolve({ text: msg });
                }
            );
        });
    }

    // 5. Command `/bids` - Active applied bids
    if (command === 'bids') {
        return new Promise((resolve) => {
            db.all(
                "SELECT ipoName, applicantName, amount, quota FROM records WHERE userId = ? AND (alloted = 'Pending' OR alloted IS NULL OR alloted = '')",
                [user.id],
                (err, rows) => {
                    if (err || !rows || rows.length === 0) {
                        return resolve({ text: "ℹ️ No pending active bids currently placed." });
                    }

                    let totalBlocked = 0;
                    let msg = `📝 <b>Active Pending Bids (${rows.length})</b>\n\n`;
                    rows.forEach(r => {
                        const amt = parseFloat(r.amount) || 0;
                        totalBlocked += amt;
                        msg += `• <b>${r.ipoName}</b> - ${r.applicantName} (${r.quota || 'Retail'})\n  Amount: ₹${amt.toLocaleString('en-IN')}\n\n`;
                    });
                    msg += `💰 <b>Total Blocked Funds:</b> ₹${totalBlocked.toLocaleString('en-IN')}`;
                    resolve({ text: msg });
                }
            );
        });
    }

    // 6. Command `/digest` - Market Calendar Summary
    if (command === 'digest') {
        return {
            text: `📅 <b>IPO Market Digest</b>\n\nCheck your web dashboard for full timetable breakdown and subscription heatmap!`
        };
    }

    return {
        text: `❓ Unknown command: <code>/${command}</code>\n\nType <code>/help</code> for available commands.`
    };
}

module.exports = { processBotMessage };
