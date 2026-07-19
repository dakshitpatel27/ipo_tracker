const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('database.sqlite');
db.run("UPDATE users SET role='master' WHERE username='dakshit1'", (err) => {
    if (err) console.error(err);
    else console.log('Successfully promoted dakshit1 to Master Admin');
    db.close();
});
