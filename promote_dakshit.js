const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('database.sqlite');
db.run("UPDATE users SET role='master' WHERE username='dakshit'", (err) => {
    if (err) console.error(err);
    else console.log('Successfully promoted dakshit to Master Admin');
    db.close();
});
