// Temporary verification script (CommonJS)
// Usage: node scripts/verify_split_translations.cjs

const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const LOCALES = path.join(ROOT, 'src', 'locales')
const MASTER = path.join(LOCALES, 'translations.csv')
const CONSTANTS = path.join(LOCALES, 'texts_constant.csv')

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

function parseRowsFromCsv(raw) {
  // returns { header: string[], rows: string[][] }
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
  const header = rows[0] || []
  const dataRows = rows.slice(1)
  return { header, rows: dataRows }
}

function serializeRow(cols) {
  return cols.map(c => {
    if (c == null) c = ''
    const needsQuotes = /[",\n\r,]/.test(c)
    if (needsQuotes) {
      return '"' + String(c).replace(/"/g, '""') + '"'
    }
    return String(c)
  }).join(',')
}

function readFileSafe(p) {
  try { return fs.readFileSync(p, { encoding: 'utf8' }) }
  catch (e) { return null }
}

// 1) Load master keys (from translations.csv) and include constants keys
const masterRaw = readFileSafe(MASTER)
if (!masterRaw) {
  console.error('Master translations.csv not found at', MASTER)
  process.exit(2)
}
let masterKeys = parseKeysFromCsv(masterRaw)

// Read constants into a map/Set but do NOT require them to appear in split files.
// Keys from texts_constant.csv are allowed to remain in that file and won't be
// considered missing.
const constRaw = readFileSafe(CONSTANTS)
const constMap = {}
const constKeys = new Set()
if (constRaw) {
  const constRows = constRaw.trim().split(/\r?\n/).slice(1) // skip header
  for (const row of constRows) {
    const r = row.trim()
    if (!r) continue
    const comma = r.indexOf(',')
    if (comma === -1) continue
    const key = r.substring(0, comma).trim()
    const value = r.substring(comma + 1).trim()
    if (key) {
      constKeys.add(key)
      constMap[key] = value
    }
  }
}

console.log(`Master keys: ${masterKeys.length} (constants ${constKeys.size} read from texts_constant.csv)`)

// 2) boolean array
// masterKeys may contain duplicate keys (same key in multiple sections).
// Map each key to an array of indices so that if a split file contains the key
// we mark all occurrences in the master as found.
const found = new Array(masterKeys.length).fill(false)
const keyIndex = {}
masterKeys.forEach((k, i) => {
  if (!keyIndex[k]) keyIndex[k] = []
  keyIndex[k].push(i)
})

// 3) load split files
const files = fs.readdirSync(LOCALES).filter(f => /^translations.*\.csv$/.test(f) && f !== 'translations.csv')
if (files.length === 0) console.warn('No split translations files found in', LOCALES)

const fileKeyMap = {}

for (const file of files) {
  const p = path.join(LOCALES, file)
  const raw = readFileSafe(p)
  if (!raw) continue
  const keys = parseKeysFromCsv(raw)
  fileKeyMap[file] = keys
  console.log(`${file}: ${keys.length} keys`)
  for (const k of keys) {
    if (keyIndex.hasOwnProperty(k)) {
      for (const idx of keyIndex[k]) found[idx] = true
    }
  }
}

// Optional: list which file contains each found key (for debugging)
const foundIn = {}
for (const [file, keys] of Object.entries(fileKeyMap)) {
  for (const k of keys) {
    if (!foundIn[k]) foundIn[k] = []
    foundIn[k].push(file)
  }
}

// 4) report: identify missing keys and write missing.csv with full rows
let missing = []
for (let i = 0; i < found.length; i++) if (!found[i]) missing.push(masterKeys[i])

// Exclude keys that are defined in texts_constant.csv (they live there intentionally)
missing = missing.filter(k => !constKeys.has(k))

if (missing.length === 0) {
  console.log('All non-constant keys found in split files ✅')
  process.exit(0)
} else {
  console.log(`Missing ${missing.length} keys:`)
  console.log(missing.join('\n'))

  // Build missing.csv from translations.csv
  const masterParsed = parseRowsFromCsv(masterRaw)
  const header = masterParsed.header
  const rows = masterParsed.rows

  // Build map of translation rows by key (first match)
  const transRowMap = {}
  for (const r of rows) {
    if (r && r[0]) {
      if (!transRowMap[r[0]]) transRowMap[r[0]] = []
      transRowMap[r[0]].push(r)
    }
  }

  // Rows present in translations.csv for missing keys
  const missingRows = []
  const missingSet = new Set(missing)
  for (const k of Object.keys(transRowMap)) {
    if (missingSet.has(k)) {
      for (const r of transRowMap[k]) missingRows.push(r)
      missingSet.delete(k)
    }
  }

  // For any remaining missing keys, try to pull from texts_constant.csv
  const constRaw = readFileSafe(CONSTANTS)
  const constMap = {}
  if (constRaw) {
    const constRows = constRaw.trim().split(/\r?\n/).slice(1) // skip header
    for (const row of constRows) {
      const r = row.trim()
      if (!r) continue
      const comma = r.indexOf(',')
      if (comma === -1) continue
      const key = r.substring(0, comma).trim()
      const value = r.substring(comma + 1).trim()
      if (key) constMap[key] = value
    }
  }

  // If header missing, create a simple one with 'key' and 'en'
  const outHeader = (header && header.length) ? header : ['key', 'en']

  // Determine en column index
  let enIndex = outHeader.indexOf('en')
  if (enIndex === -1) enIndex = 1 // default to second column

  // Synthesize rows for remaining missing keys using constants (put value into en column)
  for (const k of Array.from(missingSet)) {
    const val = constMap[k] || ''
    const synth = new Array(outHeader.length).fill('')
    synth[0] = k
    synth[enIndex] = val
    missingRows.push(synth)
  }

  const outPath = path.join(LOCALES, 'missing.csv')
  const outLines = []
  if (outHeader && outHeader.length) {
    outLines.push(serializeRow(outHeader))
  }
  for (const r of missingRows) outLines.push(serializeRow(r))

  try {
    fs.writeFileSync(outPath, outLines.join('\n') + '\n', { encoding: 'utf8' })
    console.log('Wrote missing rows to', outPath)
  } catch (e) {
    console.error('Failed to write missing.csv', e)
  }

  process.exit(1)
}
