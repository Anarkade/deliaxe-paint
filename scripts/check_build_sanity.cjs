const fs = require('fs');
const path = require('path');

const distDir = path.resolve(__dirname, '..', 'dist');
const indexPath = path.join(distDir, 'index.html');

function fail(msg) {
  console.error('FAIL:', msg);
  process.exitCode = 2;
}

function pass(msg) {
  console.log('PASS:', msg);
}

if (!fs.existsSync(indexPath)) {
  fail(`Missing ${indexPath}`);
  process.exit();
}

const html = fs.readFileSync(indexPath, 'utf8');

// naive regex to capture src/href of script/link/img tags
const assetUrls = new Set();
const srcRegex = /<script[^>]+src=["']([^"']+)["']/g;
const hrefRegex = /<link[^>]+href=["']([^"']+)["']/g;
const imgRegex = /<img[^>]+src=["']([^"']+)["']/g;
let m;
while ((m = srcRegex.exec(html)) !== null) assetUrls.add(m[1]);
while ((m = hrefRegex.exec(html)) !== null) assetUrls.add(m[1]);
while ((m = imgRegex.exec(html)) !== null) assetUrls.add(m[1]);

if (assetUrls.size === 0) {
  pass('index.html found and no external assets referenced');
  process.exit(0);
}

let missing = [];
for (const url of assetUrls) {
  // ignore absolute URLs
  if (/^https?:\/\//i.test(url)) continue;
  // strip query
  const clean = url.split('?')[0].replace(/^\//, '');
  const assetPath = path.join(distDir, clean);
  if (!fs.existsSync(assetPath)) missing.push(clean);
}

if (missing.length) {
  fail(`Missing assets in dist/: ${missing.join(', ')}`);
  process.exit();
}

pass(`All ${assetUrls.size} referenced assets exist in dist/`);
process.exit(0);
