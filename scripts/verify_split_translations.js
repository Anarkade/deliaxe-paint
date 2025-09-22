// Temporary verification script
// Usage: node scripts/verify_split_translations.js

const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const LOCALES = path.join(ROOT, 'src', 'locales')
const MASTER = path.join(LOCALES, 'translations.csv')

function parseKeysFromCsv(raw) {
  const rows = []
  let cur = ['']
  let inQuotes = false
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i]
    if (ch === '"') {
      if (inQuotes && raw[i+1] === '"') { cur[cur.length-1] += '"'; i++; continue }
      inQuotes = !inQuotes
      continue
    }
    if (!inQuotes && ch === ',') { cur.push(''); continue }
    if (!inQuotes && (ch === '\n' || ch === '\r')) {
      if (ch === '\r' && raw[i+1] === '\n') i++
      rows.push(cur.map(c => c.trim()))
      cur = ['']
      continue
    }
    cur[cur.length-1] += ch
  }
  if (cur.length > 1 || (cur.length === 1 && cur[0].trim() !== '')) rows.push(cur.map(c => c.trim()))
  const keys = []
  for (let r = 1; r < rows.length; r++) {
    const key = rows[r][0]
    if (key) keys.push(key)
  }
  return keys
}

function readFileSafe(p) {
  try { return fs.readFileSync(p, { encoding: 'utf8' }) }
  catch (e) { return null }
}

// 1) Load master keys
const masterRaw = readFileSafe(MASTER)
if (!masterRaw) {
  console.error('Master translations.csv not found at', MASTER)
  process.exit(2)
}
const masterKeys = parseKeysFromCsv(masterRaw)
console.log(`Master keys: ${masterKeys.length}`)

// 2) boolean array
const found = new Array(masterKeys.length).fill(false)
const keyIndex = {}
masterKeys.forEach((k, i) => keyIndex[k] = i)

// 3) load split files
const files = fs.readdirSync(LOCALES).filter(f => /^translations.*\.csv$/.test(f) && f !== 'translations.csv')
if (files.length === 0) console.warn('No split translations files found in', LOCALES)

for (const file of files) {
  const p = path.join(LOCALES, file)
  const raw = readFileSafe(p)
  if (!raw) continue
  const keys = parseKeysFromCsv(raw)
  for (const k of keys) {
    if (keyIndex.hasOwnProperty(k)) found[keyIndex[k]] = true
  }
}

// 4) report
const missing = []
for (let i = 0; i < found.length; i++) if (!found[i]) missing.push(masterKeys[i])

if (missing.length === 0) {
  console.log('All keys found in split files ✅')
  process.exit(0)
} else {
  console.log(`Missing ${missing.length} keys:`)
  console.log(missing.join('\n'))
  process.exit(1)
}
