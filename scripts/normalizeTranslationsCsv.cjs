const fs = require('fs');
const path = require('path');

const csvPath = path.resolve(__dirname, '../src/locales/translations.csv');
const raw = fs.readFileSync(csvPath, 'utf8');

// Simple CSV parser to rows/cols supporting quoted fields (RFC-ish)
function parse(raw) {
  const rows = [];
  let cur = [''];
  let inQuotes = false;
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (ch === '"') {
      if (inQuotes && raw[i + 1] === '"') {
        cur[cur.length - 1] += '"';
        i++;
        continue;
      }
      inQuotes = !inQuotes;
      continue;
    }
    if (!inQuotes && ch === ',') {
      cur.push('');
      continue;
    }
    if (!inQuotes && (ch === '\n' || ch === '\r')) {
      if (ch === '\r' && raw[i + 1] === '\n') i++;
      rows.push(cur.map(c => c));
      cur = [''];
      continue;
    }
    cur[cur.length - 1] += ch;
  }
  if (cur.length > 1 || (cur.length === 1 && cur[0].trim() !== '')) rows.push(cur.map(c => c));
  return rows;
}

function quoteField(f) {
  if (f == null) return '""';
  const needsQuote = /[",\r\n]/.test(f);
  let out = String(f);
  out = out.replace(/"/g, '""');
  if (needsQuote || out === '') return '"' + out + '"';
  return out;
}

const rows = parse(raw);
const out = rows.map(row => row.map(quoteField).join(',')).join('\n') + '\n';
fs.writeFileSync(csvPath, out, 'utf8');
console.log('Normalized', csvPath);
