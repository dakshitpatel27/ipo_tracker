const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('Building frontend...');
execSync('npm install && npm run build', { cwd: path.join(__dirname, 'frontend'), stdio: 'inherit' });

console.log('Copying frontend/dist to public...');
const src = path.join(__dirname, 'frontend', 'dist');
const dest = path.join(__dirname, 'public');

if (fs.existsSync(dest)) {
    fs.rmSync(dest, { recursive: true, force: true });
}

fs.cpSync(src, dest, { recursive: true });
console.log('Build completed successfully.');
