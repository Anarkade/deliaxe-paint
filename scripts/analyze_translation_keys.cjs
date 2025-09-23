#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Configuration
const LOCALES_DIR = path.join(__dirname, '../src/locales');
const SRC_DIR = path.join(__dirname, '../src');
const SCRIPTS_DIR = path.join(__dirname, '../scripts');
const ROOT_DIR = path.join(__dirname, '..');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bold: '\x1b[1m'
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Parse CSV line respecting quoted fields
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  let i = 0;
  
  while (i < line.length) {
    const char = line[i];
    const nextChar = line[i + 1];
    
    if (char === '"' && !inQuotes) {
      inQuotes = true;
    } else if (char === '"' && inQuotes) {
      if (nextChar === '"') {
        // Escaped quote
        current += '"';
        i++; // Skip next quote
      } else {
        inQuotes = false;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
    i++;
  }
  
  // Add the last field
  result.push(current.trim());
  return result;
}

// Get all CSV files in locales directory
function getCSVFiles() {
  const files = fs.readdirSync(LOCALES_DIR)
    .filter(file => file.endsWith('.csv'))
    .map(file => path.join(LOCALES_DIR, file));
  
  log('blue', `Found ${files.length} CSV files in locales directory:`);
  files.forEach(file => log('cyan', `  - ${path.basename(file)}`));
  console.log();
  
  return files;
}

// Extract keys from a CSV file
function extractKeysFromCSV(csvPath) {
  const content = fs.readFileSync(csvPath, 'utf8');
  const lines = content.split('\n').filter(line => line.trim());
  const keys = [];
  
  // Skip header (line 1) and process from line 2 onwards
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line) {
      const parsed = parseCSVLine(line);
      if (parsed.length > 0 && parsed[0]) {
        keys.push(parsed[0]);
      }
    }
  }
  
  return keys;
}

// Step 1: Load all keys from CSV files
function loadAllKeys() {
  const csvFiles = getCSVFiles();
  const allKeys = new Map(); // key -> [filenames where it appears]
  
  log('bold', '=== STEP 1: Loading keys from CSV files ===');
  
  csvFiles.forEach(csvFile => {
    const fileName = path.basename(csvFile);
    const keys = extractKeysFromCSV(csvFile);
    
    log('green', `Loaded ${keys.length} keys from ${fileName}`);
    
    keys.forEach(key => {
      if (!allKeys.has(key)) {
        allKeys.set(key, []);
      }
      allKeys.get(key).push(fileName);
    });
  });
  
  console.log();
  log('blue', `Total unique keys found: ${allKeys.size}`);
  console.log();
  
  return allKeys;
}

// Step 2: Find duplicated keys
function findDuplicatedKeys(allKeys) {
  log('bold', '=== STEP 2: Finding duplicated keys ===');
  
  const duplicatedKeys = [];
  const withinFileKeys = [];
  
  for (const [key, files] of allKeys.entries()) {
    // Count occurrences per file
    const fileCounts = {};
    files.forEach(file => {
      fileCounts[file] = (fileCounts[file] || 0) + 1;
    });
    
    // Check for duplicates within same file
    for (const [file, count] of Object.entries(fileCounts)) {
      if (count > 1) {
        withinFileKeys.push({ key, file, count });
      }
    }
    
    // Check for duplicates across different files
    const uniqueFiles = [...new Set(files)];
    if (uniqueFiles.length > 1) {
      duplicatedKeys.push({ key, files: uniqueFiles });
    }
  }
  
  // Report within-file duplicates
  log('magenta', '--- DUPLICATES WITHIN THE SAME FILE ---');
  if (withinFileKeys.length === 0) {
    log('green', '✓ No keys duplicated within the same file!');
  } else {
    log('red', `✗ Found ${withinFileKeys.length} keys duplicated within the same file:`);
    
    // Group by file for better organization
    const byFile = {};
    withinFileKeys.forEach(({ key, file, count }) => {
      if (!byFile[file]) byFile[file] = [];
      byFile[file].push({ key, count });
    });
    
    Object.entries(byFile).forEach(([file, duplicates]) => {
      log('yellow', `\n  📄 File: ${file}`);
      duplicates.forEach(({ key, count }) => {
        log('red', `    ❌ "${key}" appears ${count} times`);
      });
    });
  }
  console.log();
  
  // Report cross-file duplicates
  log('magenta', '--- DUPLICATES ACROSS DIFFERENT FILES ---');
  if (duplicatedKeys.length === 0) {
    log('green', '✓ No keys duplicated across different files!');
  } else {
    log('red', `✗ Found ${duplicatedKeys.length} keys duplicated across different files:`);
    duplicatedKeys.forEach(({ key, files }) => {
      log('yellow', `\n  🔑 Key: "${key}"`);
      log('cyan', `    Found in ${files.length} files:`);
      files.forEach(file => log('cyan', `      - ${file}`));
    });
  }
  
  console.log();
  return { crossFileKeys: duplicatedKeys, withinFileKeys };
}

// Get all source code files to scan
function getSourceCodeFiles() {
  const extensions = ['.ts', '.tsx', '.js', '.jsx', '.vue', '.html', '.css', '.scss', '.json', '.cjs', '.mjs'];
  const files = [];
  
  function scanDirectory(dir) {
    if (!fs.existsSync(dir)) return;
    
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        // Skip node_modules, .git, dist, build directories
        if (!['node_modules', '.git', 'dist', 'build', '.next', '.vscode', 'public'].includes(item)) {
          scanDirectory(fullPath);
        }
      } else if (stat.isFile()) {
        const ext = path.extname(item);
        if (extensions.includes(ext)) {
          files.push(fullPath);
        }
      }
    }
  }
  
  // Scan src directory (all subdirectories including components, contexts, hooks, etc.)
  scanDirectory(SRC_DIR);
  
  // Scan scripts directory
  scanDirectory(SCRIPTS_DIR);
  
  // Scan root level files
  const rootFiles = fs.readdirSync(ROOT_DIR);
  rootFiles.forEach(file => {
    const fullPath = path.join(ROOT_DIR, file);
    const stat = fs.statSync(fullPath);
    if (stat.isFile()) {
      const ext = path.extname(file);
      if (extensions.includes(ext)) {
        files.push(fullPath);
      }
    }
  });
  
  return files;
}

// Step 3: Find unused keys
function findUnusedKeys(allKeys) {
  log('bold', '=== STEP 3: Scanning source code for key usage ===');
  
  const sourceFiles = getSourceCodeFiles();
  const usedKeys = new Set();
  let getLanguageNameUsed = false;
  log('blue', `Scanning ${sourceFiles.length} source code files...`);
  console.log();
  sourceFiles.forEach(filePath => {
    const relativePath = path.relative(ROOT_DIR, filePath);
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      // Detect usage of getLanguageName (indirect usage of languageNames.* keys)
      if (/getLanguageName\s*\(/.test(content)) {
        getLanguageNameUsed = true;
      }
      // Check each key to see if it appears in this file
      for (const key of allKeys.keys()) {
        const patterns = [
          new RegExp(`["'\`]${escapeRegex(key)}["'\`]`, 'g'),
          new RegExp(`\\.${escapeRegex(key)}\\b`, 'g'),
          new RegExp(`\\[["']${escapeRegex(key)}["']\\]`, 'g'),
          new RegExp(`{["']${escapeRegex(key)}["']}`, 'g'),
          new RegExp(`\\b(t|translate|useTranslation|getTranslation|getText)\\s*\\(\\s*["'\`]${escapeRegex(key)}["'\`]`, 'g'),
          new RegExp(`{\\s*(t|translate)\\s*\\(\\s*["'\`]${escapeRegex(key)}["'\`]`, 'g'),
          new RegExp(`\\b${escapeRegex(key)}\\b`, 'g'),
          new RegExp(`["']${escapeRegex(key)}["']\\s*:`, 'g'),
          new RegExp(`${escapeRegex(key)}\\s*,`, 'g')
        ];
        const found = patterns.some(pattern => pattern.test(content));
        if (found) {
          usedKeys.add(key);
        }
      }
      log('green', `✓ Scanned: ${relativePath}`);
    } catch (error) {
      log('red', `✗ Error scanning ${relativePath}: ${error.message}`);
    }
  });
  // If getLanguageName is used anywhere, mark all languageNames.* keys as used
  if (getLanguageNameUsed) {
    for (const key of allKeys.keys()) {
      if (key.startsWith('languageNames.')) {
        usedKeys.add(key);
      }
    }
  }
  
  console.log();
  log('blue', `Found ${usedKeys.size} keys used in source code`);
  
  return usedKeys;
}

// Helper function to escape regex special characters
function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Step 4: Report unused keys
function reportUnusedKeys(allKeys, usedKeys) {
  log('bold', '=== STEP 4: Unused keys report ===');
  
  const unusedKeys = [];
  
  for (const [key, files] of allKeys.entries()) {
    if (!usedKeys.has(key)) {
      unusedKeys.push({ key, files });
    }
  }
  
  if (unusedKeys.length === 0) {
    log('green', 'All keys are used in the source code!');
  } else {
    log('yellow', `Found ${unusedKeys.length} unused keys:`);
    console.log();
    
    unusedKeys.forEach(({ key, files }) => {
      log('red', `  Unused key: "${key}"`);
      files.forEach(file => log('cyan', `    Found in: ${file}`));
      console.log();
    });
  }
  
  return unusedKeys;
}

// Main execution
function main() {
  log('bold', 'Translation Key Analysis Tool');
  log('bold', '============================');
  console.log();
  
  try {
    // Step 1: Load all keys
    const allKeys = loadAllKeys();
    
    // Step 2: Find duplicated keys
    const { crossFileKeys, withinFileKeys } = findDuplicatedKeys(allKeys);
    
    // Step 3: Find unused keys
    const usedKeys = findUnusedKeys(allKeys);
    
    // Step 4: Report unused keys
    const unusedKeys = reportUnusedKeys(allKeys, usedKeys);
    
    // Summary
    log('bold', '=== SUMMARY ===');
    log('blue', `Total keys: ${allKeys.size}`);
    log(crossFileKeys.length > 0 ? 'red' : 'green', `Keys duplicated across files: ${crossFileKeys.length}`);
    log(withinFileKeys.length > 0 ? 'red' : 'green', `Keys duplicated within same file: ${withinFileKeys.length}`);
    log(unusedKeys.length > 0 ? 'yellow' : 'green', `Unused keys: ${unusedKeys.length}`);
    log('green', `Used keys: ${usedKeys.size}`);
    
  } catch (error) {
    log('red', `Error: ${error.message}`);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = {
  loadAllKeys,
  findDuplicatedKeys,
  findUnusedKeys,
  reportUnusedKeys
};