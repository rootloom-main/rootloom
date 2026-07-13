const fs = require('fs');
const path = require('path');

const workspace = process.cwd();
const pageBundlePath = path.join(workspace, '.next', 'server', 'app', 'admin', 'orders', '[id]', 'page.js');
const maxBytes = 250 * 1024;

if (!fs.existsSync(pageBundlePath)) {
  console.error(`Missing built admin order page bundle: ${pageBundlePath}`);
  process.exit(1);
}

const source = fs.readFileSync(pageBundlePath, 'utf8');
const size = Buffer.byteLength(source);

if (source.includes('@react-pdf') || source.includes('PDFDownloadLink')) {
  console.error('Admin order page bundle still includes client PDF renderer code.');
  process.exit(1);
}

if (size > maxBytes) {
  console.error(`Admin order page server bundle is ${size} bytes; budget is ${maxBytes} bytes.`);
  process.exit(1);
}

console.log(`ok - admin order page bundle ${size} bytes under ${maxBytes} byte budget`);
