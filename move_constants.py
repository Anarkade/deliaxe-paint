import csv

# Keys to move to constants (found to be identical across all languages)
keys_to_move = [
    'orText',      # "or" in all languages
    'close',       # "Close" in all languages
    'originalPalette',  # "Original" in all languages
    'original',    # "Original" in all languages
    'originalSize' # "Original" in all languages
]

# Read translations.csv
translations_path = r"d:\Anarkade\Deliaxe Paint\vintage-palette-studio\src\locales\translations.csv"
constants_path = r"d:\Anarkade\Deliaxe Paint\vintage-palette-studio\src\locales\texts_constant.csv"

with open(translations_path, 'r', encoding='utf-8') as f:
    reader = csv.reader(f)
    rows = list(reader)

header = rows[0]
data_rows = rows[1:]

print(f"Original translations.csv has {len(data_rows)} rows")

# Separate rows to keep and rows to move
rows_to_keep = []
rows_to_move = []

for row in data_rows:
    if row[0] in keys_to_move:
        rows_to_move.append(row)
    else:
        rows_to_keep.append(row)

print(f"Moving {len(rows_to_move)} rows to constants")
print(f"Keeping {len(rows_to_keep)} rows in translations")

# Read existing constants
with open(constants_path, 'r', encoding='utf-8') as f:
    constants_reader = csv.reader(f)
    constants_rows = list(constants_reader)

print(f"Constants file currently has {len(constants_rows)} rows")

# Add new constants
for row in rows_to_move:
    key = row[0]
    # Get the English value (assuming it's the same across all languages)
    english_value = row[1]
    constants_rows.append([key, english_value])

print(f"Constants file will have {len(constants_rows)} rows after adding")

# Write updated constants file
with open(constants_path, 'w', encoding='utf-8', newline='') as f:
    writer = csv.writer(f)
    writer.writerows(constants_rows)

print("Updated texts_constant.csv")

# Write updated translations file
with open(translations_path, 'w', encoding='utf-8', newline='') as f:
    writer = csv.writer(f)
    writer.writerow(header)
    writer.writerows(rows_to_keep)

print("Updated translations.csv")
print(f"Removed {len(rows_to_move)} identical rows from translations.csv")

# Show what was moved
print("\nMoved to constants:")
for row in rows_to_move:
    print(f"  {row[0]}: '{row[1]}'")