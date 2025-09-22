#!/usr/bin/env node
/*
  scripts/fix_translations_gemini.cjs (was: fix_translations_libre.cjs)

  Scans the repository for .csv files (excluding node_modules, dist, .git),
  reads the header to locate language columns, and for every row uses
  Google Gemini (Generative Language API) to produce a translation of the
  English text. If the predicted translation differs from the existing one,
  it updates the CSV in-place and logs the change.

  This project previously used LibreTranslate; per current instructions that
  dependency has been removed and the fixer now uses Gemini exclusively.

  Usage:
    # Default: dry-run (no files modified). To actually write changes use --apply or APPLY=1
    set GOOGLE_API_KEY=<your-key>    # cmd.exe (Windows)
    $env:GOOGLE_API_KEY = '<your-key>' # PowerShell
    node scripts/fix_translations_libre.cjs          # dry-run (no writes)
    set APPLY=1 && set GOOGLE_API_KEY=<your-key> && node scripts/fix_translations_libre.cjs  # write changes

  Environment variables:
    GOOGLE_API_KEY - REQUIRED for applying changes. If missing, the script
                     will still run in dry-run mode (default) but will not
                     call the Gemini API or write files.
    APPLY - optional, set to 1 to actually write edited CSVs to disk (or use --apply flag)
    GEMINI_MODEL   - optional, default: gemini-2.5-flash. Choose a supported
                       model name from the Generative Language API.

  Notes:
    - This script no longer calls LibreTranslate or any other external
      open-source translation service. Remove any local LibreTranslate
      containers or configuration if you no longer need them.
*/

const fs = require('fs');
const path = require('path');
const os = require('os');

const FETCH_TIMEOUT = 20000;
// Google Gemini configuration: require an API key and optionally a model
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || null;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

function langCodeToName(code) {
  if (!code) return null;
  const c = code.toLowerCase();
  if (c.startsWith('es')) return 'Spanish';
  if (c.startsWith('en')) return 'English';
  if (c.startsWith('pt')) return 'Portuguese';
  if (c.startsWith('fr')) return 'French';
  if (c.startsWith('de')) return 'German';
  if (c.startsWith('it')) return 'Italian';
  if (c.startsWith('ja')) return 'Japanese';
  if (c.startsWith('ko')) return 'Korean';
  if (c.startsWith('ru')) return 'Russian';
  if (c.startsWith('tr')) return 'Turkish';
  if (c.startsWith('zh')) return 'Chinese';
  if (c.startsWith('pl')) return 'Polish';
  if (c.startsWith('nl')) return 'Dutch';
  if (c.startsWith('hi')) return 'Hindi';
  if (c.startsWith('ar')) return 'Arabic';
  return null;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// Simple CSV line parser that handles quoted fields with commas and double-quotes
function parseCSVLine(line) {
  const res = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i+1] === '"') { cur += '"'; i++; }
        else { inQuotes = false; }
      } else { cur += ch; }
    } else {
      if (ch === ',') { res.push(cur); cur = ''; }
      else if (ch === '"') { inQuotes = true; }
      else { cur += ch; }
    }
  }
  res.push(cur);
  return res;
}

function escapeCSVField(s) {
  if (s == null) return '';
  s = String(s);
  if (s.includes('"')) s = s.replace(/"/g, '""');
  if (s.includes(',') || s.includes('\n') || s.includes('"')) return '"' + s + '"';
  return s;
}

function stringifyCSVRow(arr) {
  return arr.map(escapeCSVField).join(',');
}

function walkDir(dir, filelist = []) {
  const files = fs.readdirSync(dir);
  for (const f of files) {
    const full = path.join(dir, f);
    const st = fs.statSync(full);
    if (st.isDirectory()) {
      const base = path.basename(full);
      if (['node_modules', '.git', 'dist', 'public'].includes(base)) continue;
      walkDir(full, filelist);
    } else if (st.isFile() && full.toLowerCase().endsWith('.csv')) {
      filelist.push(full);
    }
  }
  return filelist;
}

// Map CSV header language codes to LibreTranslate target language codes
// For Gemini we use human language names; map CSV header codes to readable names
function csvCodeToLangName(code) {
  if (!code) return null;
  const c = code.toLowerCase();
  if (c.startsWith('es')) return 'Spanish';
  if (c.startsWith('en')) return 'English';
  if (c.startsWith('pt')) return 'Portuguese';
  if (c.startsWith('fr')) return 'French';
  if (c.startsWith('de')) return 'German';
  if (c.startsWith('it')) return 'Italian';
  if (c.startsWith('ja')) return 'Japanese';
  if (c.startsWith('ko')) return 'Korean';
  if (c.startsWith('ru')) return 'Russian';
  if (c.startsWith('tr')) return 'Turkish';
  if (c.startsWith('zh')) return 'Chinese';
  if (c.startsWith('pl')) return 'Polish';
  if (c.startsWith('nl')) return 'Dutch';
  if (c.startsWith('hi')) return 'Hindi';
  if (c.startsWith('ar')) return 'Arabic';
  return null;
}

async function translateGemini(text, targetLangCode) {
  if (!GOOGLE_API_KEY) throw new Error('GOOGLE_API_KEY missing');
  const langName = csvCodeToLangName(targetLangCode);
  if (!langName) throw new Error('Unsupported target language for Gemini: ' + targetLangCode);
  const endpoint = `https://generativelanguage.googleapis.com/v1beta2/models/${GEMINI_MODEL}:generateText?key=${GOOGLE_API_KEY}`;
  const prompt = `You are a professional translator specializing in user interface text for applications that edit and process retro pixel art and animations (retro consoles/computers style). Translate the following English UI text into ${langName}. Keep translations concise, natural, and appropriate for UI labels, buttons, tooltips and short messages. Preserve placeholders (like {0}, %s) and punctuation. Do not add extra commentary — respond with only the translated text:\n\n"""\n${text}\n"""`;
  const body = { prompt: { text: prompt }, maxOutputTokens: 512 };

  if (typeof fetch === 'function') {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal
      });
      clearTimeout(id);
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Gemini ${res.status}: ${txt}`);
      }
      const data = await res.json();
      let out = null;
      if (data.candidates && data.candidates[0]) out = data.candidates[0].output || data.candidates[0].content || data.candidates[0].text;
      if (!out && data.output) out = data.output;
      if (!out && data.choices && data.choices[0]) out = data.choices[0].message || data.choices[0].text;
      if (!out && typeof data === 'string') out = data;
      return (out || '').trim();
    } catch (err) {
      clearTimeout(id);
      throw err;
    }
  }

  // Fallback using https.request
  return new Promise((resolve, reject) => {
    try {
      const https = require('https');
      const u = new URL(endpoint);
      const bodyStr = JSON.stringify(body);
      const options = {
        hostname: u.hostname,
        port: u.port || 443,
        path: u.pathname + u.search,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(bodyStr) }
      };
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (d) => data += d);
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            try {
              const j = JSON.parse(data);
              let out = null;
              if (j.candidates && j.candidates[0]) out = j.candidates[0].output || j.candidates[0].content || j.candidates[0].text;
              if (!out && j.output) out = j.output;
              if (!out && j.choices && j.choices[0]) out = j.choices[0].message || j.choices[0].text;
              resolve((out || '').trim());
            } catch (e) { reject(e); }
          } else { reject(new Error(`Gemini ${res.statusCode}: ${data}`)); }
        });
      });
      req.on('error', reject);
      req.write(bodyStr);
      req.end();
    } catch (e) { reject(e); }
  });
}

// (duplicate translateGemini removed) - using the single implementation above

// no LibreTranslate reachability checks required anymore

async function processFile(csvPath, opts) {
  console.log('\nProcessing:', csvPath);
  const raw = fs.readFileSync(csvPath, 'utf8');
  const lines = raw.split(/\r?\n/);
  if (lines.length === 0) return;
  const headerLine = lines[0];
  const headers = parseCSVLine(headerLine);
  const enIndex = headers.findIndex(h => h && h.toLowerCase() === 'en');
  if (enIndex === -1) {
    console.warn('  Skipping file: no `en` column found');
    return;
  }
  const langIndices = headers.map((h, i) => ({ code: h, idx: i }));

  let changes = 0;
  for (let r = 1; r < lines.length; r++) {
    const rawLine = lines[r];
    if (!rawLine || rawLine.trim() === '') continue;
    if (opts.rowLimit && r > opts.rowLimit) break;
    const cols = parseCSVLine(rawLine);
    // ensure cols length matches headers
    while (cols.length < headers.length) cols.push('');
    const key = cols[0] || `<row ${r}>`;
    const enText = (cols[enIndex] || '').trim();
    if (!enText) continue; // nothing to base on

    for (const { code, idx } of langIndices) {
      if (!code) continue;
      if (idx === 0 || idx === enIndex) continue; // skip key & en
      const langName = csvCodeToLangName(code);
      if (!langName) continue; // unsupported language for Gemini mapping
      const existing = (cols[idx] || '').trim();
      // ask Gemini to translate en->langName (only if applying)
      try {
        let predicted = '';
        if (opts.apply) {
          if (!GOOGLE_API_KEY) throw new Error('GOOGLE_API_KEY missing (required when applying changes)');
          predicted = (await translateGemini(enText, code)).trim();
          await sleep(250); // courteous pacing
        } else {
          // Dry-run: don't call Gemini; produce a placeholder suggestion for display
          predicted = `<DRY-RUN suggestion for ${langName}>`;
        }
        if (!predicted) continue;
        // simple comparison; if different, update
        if (existing !== predicted) {
          // Print a grouped block so terminal wrapping doesn't split key/lang across lines
          const header = `  ${path.basename(csvPath)} [row ${r}] key=${key} lang=${code} ->`;
          const block = [header, `    OLD: ${existing}`, `    NEW: ${predicted}`].join('\n');
          console.log(block);
          // produce the CSV preview string now (this will show the full row as CSV)
          const previewRow = stringifyCSVRow(cols.map((c, i) => (i === idx ? predicted : c)));
          if (opts.apply) {
            console.log('    TO-SAVE:', previewRow);
            cols[idx] = predicted;
            changes++;
          } else {
            // Dry-run: show preview but do not modify the in-memory row
            console.log('    PREVIEW (dry-run):', previewRow);
            changes++;
          }
        }
      } catch (err) {
        console.warn(`    translate failed for ${code} on row ${r}: ${err.message}`);
        // continue with other languages
      }
    }
    // write back row (stringify now). If applying, print the exact CSV-formatted
    // string that will be written so the user can inspect it before the file
    // is updated.
    const newRowStr = stringifyCSVRow(cols);
    if (opts.apply) {
      console.log('    TO-SAVE:', newRowStr);
    }
    lines[r] = newRowStr;
  }

  if (changes > 0) {
    if (opts.apply) fs.writeFileSync(csvPath, lines.join(os.EOL), 'utf8');
    else console.log(`  (dry-run) ${csvPath} would be changed: ${changes} texts.`);
  }
  console.log(`  Finished ${csvPath}: changed ${changes} texts.`);
}

async function ensureModelAvailable() {
  if (!GOOGLE_API_KEY) return; // nothing to check in dry-run/no-key mode
  try {
    const u = `https://generativelanguage.googleapis.com/v1beta2/models?key=${GOOGLE_API_KEY}`;
    const https = require('https');
    await new Promise((resolve, reject) => {
      https.get(u, (res) => {
        let data = '';
        res.on('data', (d) => data += d);
        res.on('end', () => {
          try {
            const j = JSON.parse(data);
            if (!j.models || !Array.isArray(j.models)) {
              console.warn('  Could not retrieve models list from Generative Language API.');
              resolve();
              return;
            }
            // Look for a model that supports generateText (or has a displayName indicating text)
            const gen = j.models.find(m => (m.supportedGenerationMethods && m.supportedGenerationMethods.includes('generateText')) || (m.displayName && /Gemini|bison|text/i.test(m.displayName)));
            if (!gen) {
              console.error('\nERROR: Your API key does not appear to have access to any text-generation models.');
              console.error('The models endpoint returned:', JSON.stringify(j.models, null, 2));
              console.error('Action: enable the Generative Language API in the Google Cloud project that owns this key, or use an API key with access to a text-generation model (e.g. gemini-* or text-bison-*).');
              console.error('You can also set GEMINI_MODEL to a model name available to your key.');
              process.exit(1);
            }
            // otherwise ok
            console.log('  Found generation-capable model:', gen.name || gen.displayName);
            resolve();
          } catch (e) { resolve(); }
        });
      }).on('error', () => resolve());
    });
  } catch (e) {
    // ignore errors for now; calls will reveal issues
  }
}

async function main() {
  console.log('Gemini fixer starting...');
  const argv = process.argv.slice(2);
  const applyFlag = argv.includes('--apply') || process.env.APPLY === '1';
  const opts = { apply: applyFlag };
  if (opts.apply && !GOOGLE_API_KEY) {
    console.error('ERROR: GOOGLE_API_KEY is required when APPLY=1 or --apply is supplied.');
    process.exit(1);
  }
  const root = process.cwd();
  let csvFiles = walkDir(root);
  // If an API key is provided, ensure it has access to a generation-capable model
  await ensureModelAvailable();
  // allow processing a single file: --file=relative/or/absolute/path or --only=
  const fileArg = argv.find(a => a.startsWith('--file=') || a.startsWith('--only='));
  const firstFlag = argv.includes('--first');
  const limitArg = argv.find(a => a.startsWith('--limit='));
  let rowLimit = null;
  if (firstFlag) rowLimit = 1;
  if (limitArg) rowLimit = parseInt(limitArg.split('=')[1], 10) || null;
  if (fileArg) {
    const parts = fileArg.split('=');
    const rel = parts[1] || '';
    const abs = path.resolve(root, rel);
    if (!fs.existsSync(abs)) {
      console.error('ERROR: requested file not found:', abs);
      process.exit(1);
    }
    csvFiles = [abs];
  }
  console.log(opts.apply ? 'Mode: APPLY (files will be written)' : 'Mode: DRY-RUN (no files will be written)');
  if (csvFiles.length === 0) { console.log('No CSV files found.'); return; }
  for (const f of csvFiles) {
    try { await processFile(f, Object.assign({}, opts, { rowLimit })); } catch (e) { console.error('Error processing', f, e); }
  }
  console.log('\nAll done.');
}

main().catch(err => { console.error(err); process.exit(1); });
