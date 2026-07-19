const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret123';
const token = jwt.sign({ id: 2, username: 'dakshit', role: 'master', status: 'approved' }, JWT_SECRET, { expiresIn: '7d' });

fetch('http://localhost:3000/api/users', {
  headers: { 'Authorization': `Bearer ${token}` }
})
.then(res => res.text().then(text => console.log(res.status, text)))
.catch(err => console.error(err));
