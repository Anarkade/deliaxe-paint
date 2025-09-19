#!/usr/bin/env python3
import csv
from pathlib import Path

csv_path = Path('src/locales/translations.csv')
if not csv_path.exists():
    print('translations.csv not found at', csv_path)
    raise SystemExit(1)

with csv_path.open(newline='', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    if 'cs' not in reader.fieldnames:
        print('No `cs` column found in CSV. Columns:', reader.fieldnames)
        raise SystemExit(2)
    total = 0
    filled = 0
    missing_keys = []
    for row in reader:
        total += 1
        val = row.get('cs', '')
        if val is not None and val.strip() != '':
            filled += 1
        else:
            key = row.get('key') or row.get('Key') or f'row#{total}'
            missing_keys.append(key)

print(f'Total keys: {total}')
print(f'Filled cs: {filled}')
print(f'Missing cs: {total - filled}')
if missing_keys:
    print('\nFirst 50 missing keys:')
    for k in missing_keys[:50]:
        print('-', k)
