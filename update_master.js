const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('database.sqlite');
db.serialize(() => {
    // Demote dakshit1 back to admin
    db.run("UPDATE users SET role='admin' WHERE username='dakshit1'");
    // Promote dakshit@gmail.com to master
    db.run("UPDATE users SET role='master' WHERE email='dakshit@gmail.com'", (err) => {
        if (err) console.error(err);
        else console.log('Successfully updated roles: dakshit@gmail.com is now Master Admin.');
        db.close();
    });
});
