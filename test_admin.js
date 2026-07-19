const test = async () => {
  const loginRes = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'dakshit', password: 'password' }) // Or just try to get the token directly
  });
  
  if (!loginRes.ok) {
    console.log('Login failed', await loginRes.text());
    return;
  }
  const token = (await loginRes.json()).token;
  
  const usersRes = await fetch('http://localhost:3000/api/users', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  console.log('Users Status:', usersRes.status);
  console.log('Users Response:', await usersRes.text());
};
test();
