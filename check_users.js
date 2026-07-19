const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('database.sqlite');

db.all("SELECT id, username, email, role, status FROM users", [], (err, rows) => {
  if (err) console.error(err);
  else console.table(rows);
  db.close();
});
