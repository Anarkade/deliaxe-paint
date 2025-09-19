#!/usr/bin/env python3
"""
Small helper to extract missing translations from src/locales/translations.csv
and apply translated JSON back into the CSV.

Usage:
  python scripts/translate_csv.py --extract <lang> --out <file.json>
  python scripts/translate_csv.py --apply <lang> --file <file.json>

Behavior:
- Extract: writes a JSON mapping { "key": "source text" } for rows where the
  target language column is empty but `en` has text.
- Apply: reads the JSON and updates the CSV column for the language, creating a
  backup `translations.csv.bak.<timestamp>` before writing. It preserves CSV
  quoting and warns on placeholder mismatch.

This script is intentionally conservative: it won't overwrite non-empty cells
unless `--force` is passed.
"""
from __future__ import annotations

import argparse
import csv
import json
import os
import re
import shutil
import sys
from datetime import datetime
from typing import Dict, List, Tuple

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
CSV_PATH = os.path.join(ROOT, 'src', 'locales', 'translations.csv')

PLACEHOLDER_RE = re.compile(r"\{[^}]+\}")


def read_csv(path: str) -> Tuple[List[str], List[Dict[str, str]]]:
    with open(path, 'r', encoding='utf-8', newline='') as f:
        reader = csv.DictReader(f)
        headers = reader.fieldnames or []
        rows = [row for row in reader]
    return headers, rows


def write_csv(path: str, headers: List[str], rows: List[Dict[str, str]]):
    tmp = path + '.tmp'
    with open(tmp, 'w', encoding='utf-8', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=headers)
        writer.writeheader()
        for r in rows:
            # Ensure we only write keys that are present in headers.
            # DictReader can include an extra None key for stray columns; filter it out.
            row_out = {h: (r.get(h) or '') for h in headers}
            writer.writerow(row_out)
    os.replace(tmp, path)


def backup(path: str) -> str:
    ts = datetime.utcnow().strftime('%Y%m%dT%H%M%SZ')
    bak = f"{path}.bak.{ts}"
    shutil.copy2(path, bak)
    return bak


def extract(lang: str, out: str, only_empty: bool):
    headers, rows = read_csv(CSV_PATH)
    if 'en' not in headers:
        print("CSV has no 'en' column", file=sys.stderr)
        sys.exit(2)
    if lang not in headers:
        print(f"CSV has no '{lang}' column; available columns: {headers}", file=sys.stderr)
        sys.exit(2)

    data: Dict[str, str] = {}
    for r in rows:
        key = r.get('key') or r.get('id') or None
        if not key:
            continue
        en = (r.get('en') or '').strip()
        tgt = (r.get(lang) or '').strip()
        if not en:
            continue
        if only_empty and tgt:
            continue
        # Only extract when target empty OR when target equals en (optionally)
        if not tgt:
            data[key] = en
    with open(out, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"Wrote {len(data)} entries to {out}")


def placeholders(text: str) -> List[str]:
    return PLACEHOLDER_RE.findall(text or '')


def apply(lang: str, file: str, force: bool):
    headers, rows = read_csv(CSV_PATH)
    if 'en' not in headers:
        print("CSV has no 'en' column", file=sys.stderr)
        sys.exit(2)
    if lang not in headers:
        print(f"CSV has no '{lang}' column; available columns: {headers}", file=sys.stderr)
        sys.exit(2)

    with open(file, 'r', encoding='utf-8') as f:
        data = json.load(f)

    updated = 0
    skipped = 0
    issues = 0

    bak = backup(CSV_PATH)
    print(f"Backup created: {bak}")

    for r in rows:
        key = r.get('key') or r.get('id') or None
        if not key:
            continue
        en = (r.get('en') or '').strip()
        if not en:
            continue
        old = (r.get(lang) or '')
        new = data.get(key)
        if new is None:
            continue
        new = new.strip()
        if old and not force:
            skipped += 1
            continue
        # Placeholder validation
        en_ph = set(placeholders(en))
        new_ph = set(placeholders(new))
        if en_ph != new_ph:
            print(f"Placeholder mismatch for key '{key}': en={en_ph} new={new_ph}")
            issues += 1
            # still write, but warn
        r[lang] = new
        updated += 1

    write_csv(CSV_PATH, headers, rows)
    print(f"Updated {updated} rows, skipped {skipped}, placeholder issues {issues}")


def main(argv: List[str]):
    p = argparse.ArgumentParser(description='CSV translation helper')
    grp = p.add_mutually_exclusive_group(required=True)
    grp.add_argument('--extract', metavar='LANG', help='Extract missing translations for LANG')
    grp.add_argument('--apply', metavar='LANG', help='Apply translations for LANG from file')
    p.add_argument('--out', '-o', metavar='FILE', help='Output file for extract')
    p.add_argument('--file', '-f', metavar='FILE', help='Input file for apply')
    p.add_argument('--force', action='store_true', help='Overwrite non-empty target cells')
    p.add_argument('--only-empty', action='store_true', help='When extracting, only include rows where target is empty')

    args = p.parse_args(argv[1:])

    if args.extract:
        out = args.out or f"to_translate_{args.extract}.json"
        extract(args.extract, out, args.only_empty)
    elif args.apply:
        if not args.file:
            print("--file is required with --apply", file=sys.stderr)
            sys.exit(2)
        apply(args.apply, args.file, args.force)


if __name__ == '__main__':
    main(sys.argv)
