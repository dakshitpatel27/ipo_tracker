const test = async () => {
  const loginRes = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'dakshit', password: 'password' }) // I don't know the password actually.
  });
  console.log('Login Status:', loginRes.status);
  if (!loginRes.ok) {
    console.log(await loginRes.text());
    return;
  }
  const loginData = await loginRes.json();
  const token = loginData.token;
  console.log('Token received:', token.substring(0, 20) + '...');

  const meRes = await fetch('http://localhost:3000/api/auth/me', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  console.log('Me Status:', meRes.status);
  const meData = await meRes.text();
  console.log('Me Data:', meData);
};
test();
