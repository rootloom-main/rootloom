console.log('CWD:', process.cwd());
try {
  const fs = require('fs');
  console.log('Dir contents:', fs.readdirSync('.'));
} catch (e) {
  console.error('Error reading dir:', e.message);
}
