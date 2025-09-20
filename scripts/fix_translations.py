#!/usr/bin/env python3
"""
Translation Fixer Script for Vintage Palette Studio

This script now follows a stricter flow:
1) Check CSV header integrity (and attempt revert if corrupted)
2) Verify English (en) texts are OK; abort with a clear report if issues are found
3) After English is verified, process each non-English language individually and, inside each, process each key individually
4) Only write to CSV if actual changes are made; logs are idempotent and per-language
"""

import csv
import argparse
import json
import textwrap
import os
import subprocess
import sys
import re
from typing import Dict, List, Tuple, Optional

# Expected CSV header structure
EXPECTED_HEADER = [
    'key', 'en', 'es-ES', 'es-LA', 'ca', 'zh-CN', 'zh-TW', 'ja', 'it', 'de', 
    'fr', 'pt-PT', 'ru', 'pt-BR', 'pl', 'tr', 'eu', 'oc', 'th', 'ko', 'cs'
]

# Clean commit hash to revert to if corruption is detected
CLEAN_COMMIT = "55c9647"

# Language names and contexts for retro gaming translations
LANGUAGE_INFO = {
    'es-ES': {'name': 'Spanish (Spain)', 'context': 'aplicación de edición de imágenes retro para consolas y computadoras vintage'},
    'es-LA': {'name': 'Spanish (Latin America)', 'context': 'aplicación de edición de imágenes retro para consolas y computadoras vintage'}, 
    'ca': {'name': 'Catalan', 'context': 'aplicació d\'edició d\'imatges retro per a consoles i ordinadors vintage'},
    'zh-CN': {'name': 'Chinese (Simplified)', 'context': '复古游戏机和电脑的图像编辑应用'},
    'zh-TW': {'name': 'Chinese (Traditional)', 'context': '復古遊戲機和電腦的圖像編輯應用'},
    'ja': {'name': 'Japanese', 'context': 'レトロゲーム機とコンピューターの画像編集アプリ'},
    'it': {'name': 'Italian', 'context': 'applicazione di editing di immagini retro per console e computer vintage'},
    'de': {'name': 'German', 'context': 'Retro-Bildbearbeitungsanwendung für Konsolen und Vintage-Computer'},
    'fr': {'name': 'French', 'context': 'application d\'édition d\'images rétro pour consoles et ordinateurs vintage'},
    'pt-PT': {'name': 'Portuguese (Portugal)', 'context': 'aplicação de edição de imagens retro para consolas e computadores vintage'},
    'ru': {'name': 'Russian', 'context': 'приложение для редактирования ретро-изображений для консолей и винтажных компьютеров'},
    'pt-BR': {'name': 'Portuguese (Brazil)', 'context': 'aplicativo de edição de imagens retrô para consoles e computadores vintage'},
    'pl': {'name': 'Polish', 'context': 'aplikacja do edycji obrazów retro dla konsol i komputerów vintage'},
    'tr': {'name': 'Turkish', 'context': 'konsol ve vintage bilgisayarlar için retro görüntü düzenleme uygulaması'},
    'eu': {'name': 'Basque', 'context': 'kontsola eta ordenagailu zaharretarako irudi retro editatzeko aplikazioa'},
    'oc': {'name': 'Occitan', 'context': 'aplicacion d\'edicion d\'imatges retro per consòlas e ordenadors vintage'},
    'th': {'name': 'Thai', 'context': 'แอปแก้ไขภาพเรโทรสำหรับคอนโซลและคอมพิวเตอร์วินเทจ'},
    'ko': {'name': 'Korean', 'context': '레트로 콘솔 및 빈티지 컴퓨터용 이미지 편집 앱'},
    'cs': {'name': 'Czech', 'context': 'aplikace pro editaci retro obrázků pro herní konzole a vintage počítače'}
}

# Common English words/phrases that shouldn't appear in other languages
ENGLISH_INDICATORS = {
    'common_words': [
        'image', 'export', 'import', 'load', 'save', 'settings', 'preview', 'palette', 
        'viewer', 'change', 'resolution', 'grids', 'camera', 'capture', 'close', 
        'original', 'processed', 'zoom', 'width', 'height', 'center', 'stretch', 
        'fit', 'download', 'copy', 'clipboard', 'language', 'colors', 'file', 
        'error', 'loading', 'success', 'failed'
    ],
    'ui_patterns': [
        r'\[.\]',  # Hotkey patterns like [I], [E], [P]
        r'PNG.*',  # PNG format references
        r'.*Mode.*',  # Mode references
        r'Anarkade.*',  # Company name (must be kept in English)
        r'Game Boy.*',  # Console and computer names (must be kept in English)
        r'Mega Drive.*',
        r'Game Gear.*',
        r'Sega Master System.*',
        r'NES.*',
        r'SNES.*',
        r'ZX Spectrum.*',
        r'Amstrad CPC.*',
        r'MSX.*',
        r'Commodore 64.*',
        r'Commodore Amiga.*',
        r'Neo Geo.*'
    ]
}

# Certain English UI tokens are acceptable to remain identical across languages
IDENTICAL_OK_WORDS = {
    'original',  # Often identical in many languages including es-ES
    'png-24 rgb', 'png-8 indexed',  # technical tokens
}

# Keys that may intentionally remain identical (labels or tech names)
IDENTICAL_OK_KEYS = {
    'originalPalette', 'originalLabel', 'originalSize'
}

class TranslationFixer:
    def __init__(self, csv_file_path: str):
        self.csv_file_path = csv_file_path
        self.backup_created = False
        # Track whether any actual changes were applied this run
        self._data_changed = False
        # Where to write/read single translation requests
        self._script_dir = os.path.dirname(os.path.abspath(__file__))
        self._request_file = os.path.join(self._script_dir, 'translation_request.json')
        
    def check_header_integrity(self) -> bool:
        """Check if CSV header is corrupted."""
        try:
            with open(self.csv_file_path, 'r', encoding='utf-8') as f:
                reader = csv.reader(f)
                header = next(reader)
                
                # Check if header matches expected structure
                if header == EXPECTED_HEADER:
                    print("✓ Header integrity verified - structure is correct")
                    return True
                else:
                    print(f"✗ Header corruption detected!")
                    print(f"Expected: {EXPECTED_HEADER}")
                    print(f"Found: {header}")
                    return False
                    
        except Exception as e:
            print(f"✗ Error reading CSV file: {e}")
            return False
    
    def revert_to_clean_version(self) -> bool:
        """Revert CSV to clean commit if header is corrupted."""
        try:
            print(f"Reverting to clean commit {CLEAN_COMMIT}...")
            result = subprocess.run(
                ['git', 'reset', '--hard', CLEAN_COMMIT],
                cwd=os.path.dirname(self.csv_file_path),
                capture_output=True,
                text=True
            )
            
            if result.returncode == 0:
                print(f"✓ Successfully reverted to clean commit {CLEAN_COMMIT}")
                return True
            else:
                print(f"✗ Failed to revert: {result.stderr}")
                return False
                
        except Exception as e:
            print(f"✗ Error during git revert: {e}")
            return False
    
    def read_csv_data(self) -> List[Dict[str, str]]:
        """Read CSV data into list of dictionaries."""
        data = []
        try:
            with open(self.csv_file_path, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    data.append(row)
            print(f"✓ Read {len(data)} translation entries")
            return data
        except Exception as e:
            print(f"✗ Error reading CSV data: {e}")
            return []

    # ---------------------- English verification ----------------------
    def _is_placeholder_value(self, v: str) -> bool:
        if v is None:
            return True
        s = v.strip()
        if s == "":
            return True
        if s in {"1", "MT:", "TODO", "FIXME"}:
            return True
        if s.startswith("MT:"):
            return True
        return False

    def _has_balanced_placeholders(self, text: str) -> bool:
        # Simple balance check for {...} tokens
        return text.count("{") == text.count("}")

    def verify_english_texts(self, data: List[Dict[str, str]]) -> List[Dict[str, str]]:
        """Scan 'en' column for issues. Return list of issues; empty means OK."""
        issues: List[Dict[str, str]] = []
        for row in data:
            key = row.get('key', '')
            en = row.get('en', '')

            if self._is_placeholder_value(en):
                issues.append({
                    'key': key,
                    'type': 'invalid_or_placeholder',
                    'value': en
                })
                continue

            # Whitespace check
            if en != en.strip():
                issues.append({
                    'key': key,
                    'type': 'leading_trailing_whitespace',
                    'value': en
                })

            # Placeholder balance check
            if not self._has_balanced_placeholders(en):
                issues.append({
                    'key': key,
                    'type': 'unbalanced_placeholders',
                    'value': en
                })

            # Hotkey pattern sanity: if present, it should match [X] where X is one char
            hotkey_matches = re.findall(r"\[([^\]]+)\]", en)
            for m in hotkey_matches:
                if len(m) != 1:
                    issues.append({
                        'key': key,
                        'type': 'invalid_hotkey_pattern',
                        'value': en
                    })
                    break

        if issues:
            print("\n❌ English (en) verification failed. Issues found:")
            print(f"   Total EN issues: {len(issues)}")
            preview = issues[:20]
            for i, issue in enumerate(preview, 1):
                print(f"   {i:>2}. [{issue['type']}] key='{issue['key']}' value='{issue['value']}'")
            if len(issues) > len(preview):
                print(f"   ... and {len(issues) - len(preview)} more")
            print("\nPlease fix the English entries above, then re-run the script.")
        else:
            print("✓ English (en) verification passed")

        return issues
    
    def needs_translation(self, value: str, language: str, english_text: str) -> bool:
        """Check if a translation value needs fixing."""
        if not value or value.strip() == '':
            return True
        
        # Check for placeholder values
        if value in ['1', 'MT:', 'TODO', 'FIXME']:
            return True
            
        # Check for MT: prefix (machine translation markers)
        if value.startswith('MT:'):
            return True
            
        # Skip checking for English if it's the English column or app name/brand
        if language == 'en':
            return False
            
        # Don't translate brand names, console names, or technical terms that should stay in English
        english_lower = english_text.lower()
        if any(brand in english_lower for brand in ['deliaxe', 'anarkade', 'game boy', 'mega drive', 'master system', 'game gear', 'neo geo', 'zx spectrum', 'amstrad', 'commodore 64', 'commodore amiga', 'nes', 'snes']):
            return False
            
        # Trivial copyright lines like "© 2025" should be shared
        if re.fullmatch(r"\s*©\s*\d{4}\s*", english_text):
            return False

        # Check if the value is identical to English (likely untranslated)
        if value == english_text:
            # Allow identical when key/term is known to be acceptable
            if (row_key := None) is None:
                pass
            # We don’t have key here; rely on common word allowlist
            if english_text.strip().lower() in IDENTICAL_OK_WORDS:
                return False
            return True
            
        return True
    
    def get_translation(self, key: str, english_text: str, target_language: str) -> str:
        """Request a human-in-the-loop translation.

        Behavior:
        - Create/overwrite a translation_request.json with details for a single translation.
        - Print a clear prompt to stdout with context and exit the program with code 2.
        - The operator should run the script again with --answer to apply the provided translation.
        """

        lang_info = LANGUAGE_INFO.get(target_language, {"name": target_language, "context": ""})
        prompt = textwrap.dedent(f"""
        === TRANSLATION REQUEST ===
        Target language: {lang_info['name']} ({target_language})
        Key: {key}
        English source: {english_text}
        Context: {lang_info.get('context','')}

        Guidelines:
        - Preserve brand and console/computer names (e.g., Anarkade, Game Boy, Mega Drive, ZX Spectrum, MSX, Commodore).
        - Keep hotkey tags like [I], [E], [P] exactly as-is and in the same position.
        - Preserve placeholder tokens like {{width}}, {{height}}, {{count}}.
        - Keep punctuation and capitalization style unless language conventions dictate otherwise.
        - Keep PNG format strings (e.g., "PNG-24 RGB") as technical terms where appropriate.

        Please provide the best localized UI string for this key.
        === END REQUEST ===
        """)

        request_payload = {
            "key": key,
            "language": target_language,
            "language_name": lang_info["name"],
            "context": lang_info.get("context", ""),
            "english": english_text,
            "prompt": prompt.strip()
        }

        try:
            with open(self._request_file, 'w', encoding='utf-8') as rf:
                json.dump(request_payload, rf, ensure_ascii=False, indent=2)
            print(prompt)
            print(f"A translation_request.json has been written at: {self._request_file}")
            print("Re-run this script with the flags below to apply your answer:")
            print("  --answer --lang {lang} --key {key} --text \"<your translation>\"")
            print("Optionally add --continue-after-answer to keep processing next items.")
        finally:
            # Exit so the operator can provide a single translation and re-run.
            # Using exit code 2 to indicate 'awaiting translation'.
            sys.exit(2)
    
    def write_csv_data(self, data: List[Dict[str, str]]) -> bool:
        """Write updated data back to CSV file."""
        try:
            with open(self.csv_file_path, 'w', encoding='utf-8', newline='') as f:
                writer = csv.DictWriter(f, fieldnames=EXPECTED_HEADER)
                writer.writeheader()
                writer.writerows(data)
            print(f"✓ Successfully wrote {len(data)} entries to CSV")
            return True
        except Exception as e:
            print(f"✗ Error writing CSV: {e}")
            return False

    # ---------------------- Interactive per-language mode ----------------------
    def interactive_fix_language(self, lang_code: str, start_key: Optional[str] = None) -> bool:
        """Interactive loop to translate one language end-to-end.

        Flow:
        - Check header; verify English
        - Read data and locate start position (if provided)
        - For each key (optionally filtered by needs_translation), prompt for translation
        - Save to CSV after each accepted answer
        - Continue until all keys are processed or the user quits
        """

        # Validate language exists in header
        if lang_code not in EXPECTED_HEADER:
            print(f"❌ Unknown language code: {lang_code}")
            print(f"   Available languages: {', '.join(EXPECTED_HEADER[1:])}")
            return False

        # Step 1: Header integrity
        if not self.check_header_integrity():
            print("🔄 Attempting to revert to clean version...")
            if not self.revert_to_clean_version():
                print("💥 Failed to revert to clean version!")
                return False
            if not self.check_header_integrity():
                print("💥 Header still corrupted after revert!")
                return False

        # Step 2: Read
        data = self.read_csv_data()
        if not data:
            return False

        # Step 3: Verify English first
        en_issues = self.verify_english_texts(data)
        if en_issues:
            return False

        # Build key -> index mapping and locate start
        key_to_index = {row['key']: i for i, row in enumerate(data)}
        start_idx = 0
        if start_key:
            if start_key in key_to_index:
                start_idx = key_to_index[start_key]
            else:
                print(f"⚠️  start-key '{start_key}' not found. Starting from beginning.")

        # Minimal header (kept extremely short per request)
        lang_name = LANGUAGE_INFO.get(lang_code, {}).get('name', lang_code)

        updated = 0
        skipped = 0
        already_ok = 0

        i = start_idx
        total = len(data)
        while i < total:
            row = data[i]
            key = row.get('key', '')
            en_text = row.get('en', '')
            current = row.get(lang_code, '')

            # Decide whether to prompt
            should_prompt = self.needs_translation(current, lang_code, en_text)
            if not should_prompt:
                already_ok += 1
                i += 1
                continue

            # Show minimal prompt for this key
            print(f"Translate to {lang_name} ({lang_code}) for a retro pixel-art editor UI the following text: '{en_text}'")

            # Read user input (no extra options in the prompt)
            try:
                user = input("→ ").strip()
            except (EOFError, KeyboardInterrupt):
                print("\n👋 Exiting interactive mode.")
                break

            if user == "":
                # Empty input: repeat prompt for the same key until a translation is provided or user cancels
                continue

            # Apply if changed
            if user != current:
                row[lang_code] = user
                if not self.write_csv_data(data):
                    print("❌ Failed to write CSV. Stopping to avoid data loss.")
                    return False
                updated += 1
            else:
                skipped += 1

            i += 1

        # Summary
        print("\n📊 Interactive session summary")
        print(f"Updated:    {updated}")
        print(f"Skipped:    {skipped}")
        print(f"Already OK: {already_ok}")
        return True

    # ---------------------- Apply single answer ----------------------
    def apply_answer(self, lang_code: str, key: str, text: str) -> bool:
        """Apply a single translation answer directly to the CSV."""
        data = self.read_csv_data()
        if not data:
            return False
        updated = False
        for row in data:
            if row.get('key') == key:
                old = row.get(lang_code, '')
                if old != text:
                    row[lang_code] = text
                    updated = True
                break
        if updated:
            return self.write_csv_data(data)
        else:
            print("ℹ️  No change needed; the same value is already present.")
            return True

    # ---------------------- Per-language processing ----------------------
    def _process_language(self, data: List[Dict[str, str]], lang_code: str) -> Tuple[int, int]:
        """Process one language sequentially, per key. Returns (fixes_made, total_considered)."""
        lang_name = LANGUAGE_INFO.get(lang_code, {}).get('name', lang_code)
        fixes = 0
        considered = 0
        print(f"\n� Processing {lang_name} ({lang_code})...")
        for row in data:
            key = row['key']
            english = row['en']
            current_value = row.get(lang_code, '')
            considered += 1

            if not self.needs_translation(current_value, lang_code, english):
                continue

            issue_type = self._get_issue_type(current_value, english)
            if issue_type == 'mt_prefix':
                new_value = current_value.replace('MT:', '').strip()
            else:
                new_value = self.get_translation(key, english, lang_code)

            # Idempotence: only update if actually different
            if new_value != current_value:
                row[lang_code] = new_value
                self._data_changed = True
                fixes += 1
                print(f"  ✓ {key}: '{current_value}' → '{new_value}'")
        print(f"  → {fixes} fixes applied in {lang_name}")
        return fixes, considered
    
    def fix_translations(self) -> bool:
        """Main translation fixing process following the new flow."""
        print("\n🔧 Starting translation verification & per-language update...")

        # Step 1: Check header integrity
        if not self.check_header_integrity():
            print("🔄 Attempting to revert to clean version...")
            if not self.revert_to_clean_version():
                print("💥 Failed to revert to clean version!")
                return False
            # Verify header after revert
            if not self.check_header_integrity():
                print("💥 Header still corrupted after revert!")
                return False

        # Step 2: Read current data
        data = self.read_csv_data()
        if not data:
            return False

        # Step 3: Verify English
        en_issues = self.verify_english_texts(data)
        if en_issues:
            # Abort – English must be clean before translating others
            return False

        # Step 4: Process each non-English language individually, per key
        total_fixes = 0
        langs_processed = 0
        for lang_code in EXPECTED_HEADER[1:]:
            if lang_code == 'en':
                continue
            fixes, _ = self._process_language(data, lang_code)
            total_fixes += fixes
            langs_processed += 1

        # Step 5: Write only if actual changes were made
        if self._data_changed and total_fixes > 0:
            print(f"\n💾 Writing {total_fixes} fixes to CSV...")
            if self.write_csv_data(data):
                print(f"✅ Successfully applied {total_fixes} fixes across {langs_processed} languages!")
                return True
            return False
        else:
            print("ℹ️  No changes were necessary – all translations are consistent with current rules.")
            return True
    
    def _get_issue_type(self, value: str, english_text: str) -> str:
        """Determine the type of translation issue."""
        if value.startswith('MT:'):
            return 'mt_prefix'
        elif value in ['1', 'TODO', 'FIXME', '']:
            return 'placeholder'
        elif value == english_text:
            return 'untranslated'
        else:
            return 'needs_review'
    
    def run(self) -> bool:
        """Main entry point."""
        print("🎮 Vintage Palette Studio Translation Fixer")
        print("=" * 50)
        print(f"📁 Working with: {self.csv_file_path}")
        
        return self.fix_translations()

def main():
    parser = argparse.ArgumentParser(description="Deliaxe Paint translation fixer")
    parser.add_argument('--lang', type=str, help='Target language code for interactive per-language mode')
    parser.add_argument('--start-key', type=str, help='Interactive: start from a specific key')
    args = parser.parse_args()

    script_dir = os.path.dirname(os.path.abspath(__file__))
    csv_file = os.path.join(script_dir, '..', 'src', 'locales', 'translations.csv')
    csv_file = os.path.normpath(csv_file)

    if not os.path.exists(csv_file):
        print(f"❌ CSV file not found: {csv_file}")
        sys.exit(1)

    fixer = TranslationFixer(csv_file)

    # If a language is provided without --answer, run interactive per-language mode
    if args.lang:
        # By default, prompt for all keys; user can limit to only-needing
        ok = fixer.interactive_fix_language(args.lang, start_key=args.start_key)
        sys.exit(0 if ok else 1)

    success = fixer.run()
    if success:
        print("\n🎉 Translation fixing completed successfully!")
        sys.exit(0)
    else:
        print("\n💥 Translation fixing failed!")
        sys.exit(1)

if __name__ == '__main__':
    main()