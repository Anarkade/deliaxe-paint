const fs = require('fs');
const path = require('path');

const csvPath = path.resolve(__dirname, '../src/locales/translations.csv');
const ctxPath = path.resolve(__dirname, '../src/contexts/TranslationContext.tsx');

const csvRaw = fs.readFileSync(csvPath, 'utf8');
const ctxRaw = fs.readFileSync(ctxPath, 'utf8');

// parse first column keys from CSV
function parseKeys(raw) {
  const lines = raw.split(/\r?\n/).filter(Boolean);
  const header = lines.shift();
  return lines.map(l => {
    // simple parse: handle quoted key or plain
    if (l[0] === '"') {
      // read until next unescaped quote
      let i = 1;
      let key = '';
      while (i < l.length) {
        if (l[i] === '"' && l[i+1] === '"') {
          key += '"'; i += 2; continue;
        }
        if (l[i] === '"') break;
        key += l[i++];
      }
      return key;
    }
    const firstComma = l.indexOf(',');
    return firstComma === -1 ? l.trim() : l.slice(0, firstComma).trim();
  });
}

function parseBaseKeysFromCtx(raw) {
  const marker = 'const baseTranslation: Translation = {';
  const idx = raw.indexOf(marker);
  if (idx === -1) {
    throw new Error('baseTranslation marker not found');
  }
  // find the opening brace position
  const openIdx = raw.indexOf('{', idx + marker.length - 1);
  if (openIdx === -1) throw new Error('opening brace not found');

  // We'll collect top-level keys using a brace depth scan, plus extract
  // languageNames inner keys separately via regex for reliability.
  const keys = [];
  let depth = 0;
  let inString = false;
  let stringChar = null;
  for (let i = openIdx; i < raw.length; i++) {
    const ch = raw[i];
    if (inString) {
      if (ch === '\\') { i += 1; continue; }
      if (ch === stringChar) { inString = false; stringChar = null; }
      continue;
    }
    if (ch === '"' || ch === "'") { inString = true; stringChar = ch; continue; }
    if (ch === '{') { depth += 1; continue; }
    if (ch === '}') { depth -= 1; if (depth === 0) break; continue; }
    if (depth === 1) {
      // attempt to read an identifier before a colon (skip whitespace)
      let j = i;
      while (j < raw.length && /\s/.test(raw[j])) j++;
      const idStart = j;
      if (j < raw.length && /[A-Za-z_$]/.test(raw[j])) {
        j++;
        while (j < raw.length && /[A-Za-z0-9_\$\.\-]/.test(raw[j])) j++;
        let k = j;
        while (k < raw.length && /\s/.test(raw[k])) k++;
        if (raw[k] === ':') {
          const ident = raw.slice(idStart, j);
          keys.push(ident);
          i = k; // advance
        }
      }
    }
  }

  // Now extract languageNames nested keys (they appear as 'en', 'es-ES', ...)
  const langMarker = 'languageNames';
  const lnIdx = raw.indexOf(langMarker, idx);
  if (lnIdx !== -1) {
    const braceIdx = raw.indexOf('{', lnIdx);
    if (braceIdx !== -1) {
      // find matching closing brace
      let depth2 = 1;
      let j = braceIdx + 1;
      const sliceStart = braceIdx + 1;
      while (j < raw.length && depth2 > 0) {
        if (raw[j] === '{') depth2++;
        else if (raw[j] === '}') depth2--;
        j++;
      }
      const slice = raw.slice(sliceStart, j - 1);
      // find quoted keys followed by colon
      const keyRegex = /['"]([^'"]+)['"]\s*:/g;
      let match;
      while ((match = keyRegex.exec(slice))) {
        keys.push('languageNames.' + match[1]);
      }
    }
  }

  return keys;
}

const csvKeys = parseKeys(csvRaw);
const baseKeys = parseBaseKeysFromCtx(ctxRaw);

console.log('baseKeys sample:', baseKeys.slice(0,80));
console.log('csvKeys sample:', csvKeys.slice(0,80));

// Special-case languageNames: baseKeys may contain 'languageNames' (an object)
// while CSV contains rows like 'languageNames.en' — treat that as satisfied if
// CSV has any 'languageNames.' prefixed keys.
let hasLanguageNamesInCsv = csvKeys.some(k => k.startsWith('languageNames.'));
const baseKeysFiltered = baseKeys.filter(k => k !== 'languageNames');

const missingInCsv = baseKeysFiltered.filter(k => !csvKeys.includes(k));
const extraInCsv = csvKeys.filter(k => !baseKeysFiltered.includes(k) && !k.startsWith('languageNames.'));

if (!hasLanguageNamesInCsv) missingInCsv.push('languageNames');

if (missingInCsv.length || extraInCsv.length) {
  console.error('CSV <> baseTranslation mismatch');
  if (missingInCsv.length) console.error('Missing in CSV:', missingInCsv.slice(0,50));
  if (extraInCsv.length) console.error('Extra in CSV:', extraInCsv.slice(0,50));
  process.exit(2);
}
console.log('CSV keys match baseTranslation keys (counts:', baseKeys.length, ')');
process.exit(0);
