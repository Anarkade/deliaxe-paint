#!/usr/bin/env python3
"""
Fill empty translation cells in src/locales/translations.csv by copying the English `en` value
prefixed with 'EN: ' so untranslated values are visible and CSV stays complete.
This is intentionally conservative — it does not attempt machine translation.
"""
import csv
from pathlib import Path

csv_path = Path('src/locales/translations.csv')
backup_path = Path('src/locales/translations.csv.before_mark_missing.bak')
if not csv_path.exists():
    print('translations.csv not found at', csv_path)
    raise SystemExit(1)

# Backup original
backup_path.write_bytes(csv_path.read_bytes())
print('Backup written to', backup_path)

with csv_path.open(newline='', encoding='utf-8') as f:
    dr = csv.DictReader(f)
    fieldnames = dr.fieldnames or []
    rows = list(dr)

if not fieldnames or 'en' not in fieldnames:
    print('CSV appears malformed or missing `en` column; aborting')
    raise SystemExit(2)

lang_cols = [c for c in fieldnames if c not in ('key', 'en')]
filled_counts = {c: 0 for c in lang_cols}

for row in rows:
    en = (row.get('en') or '').strip()
    for col in lang_cols:
        cur = (row.get(col) or '')
        if cur is None:
            cur = ''
        if cur.strip() == '':
            # Only fill if there's an English value to copy
            if en:
                row[col] = f'EN: {en}'
                filled_counts[col] += 1
            else:
                # leave empty if even English is empty
                pass

# Write back
with csv_path.open('w', newline='', encoding='utf-8') as f:
    writer = csv.DictWriter(f, fieldnames=fieldnames)
    writer.writeheader()
    writer.writerows(rows)

# Print summary
total_filled = sum(filled_counts.values())
print(f'Total placeholders inserted: {total_filled}')
for col, cnt in filled_counts.items():
    if cnt:
        print(f'  {col}: {cnt}')

print('Done. CSV updated in place. If you want this committed, tell me and I will commit with a clear message.')
