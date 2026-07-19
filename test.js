const db = require('./db'); 
db.get("SELECT * FROM users WHERE username = 'dakshit'", (err, user) => { 
    console.log(user); 
    db.close(); 
});
