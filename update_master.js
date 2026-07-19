const db = require('./db');

setTimeout(() => {
    db.run("UPDATE users SET role='master' WHERE username='dakshitpatel27'", (err) => {
        if (err) console.error(err);
        else console.log('Successfully updated roles: dakshitpatel27 is now Master Admin.');
        process.exit(0);
    });
}, 1000);

