import csv

# Read the translations CSV
csv_path = r"d:\Anarkade\Deliaxe Paint\vintage-palette-studio\src\locales\translations.csv"

with open(csv_path, 'r', encoding='utf-8') as f:
    reader = csv.reader(f)
    rows = list(reader)

header = rows[0]
data_rows = rows[1:]

print(f"Total rows: {len(data_rows)}")
print(f"Languages: {header[1:-1]}")  # Exclude 'key' and last column
print()

# Find rows where all translation values are identical
identical_rows = []
for row in data_rows:
    if len(row) < 2:
        continue

    key = row[0]
    # Get translation values (exclude key and last column)
    translation_values = row[1:-1]

    # Check if all values are identical and non-empty
    if translation_values and all(v.strip() == translation_values[0].strip() for v in translation_values) and translation_values[0].strip():
        identical_rows.append((key, translation_values[0]))

print(f"Found {len(identical_rows)} rows with identical translations across all languages:")
print()

for key, value in identical_rows:
    print(f"{key}: '{value}'")

print()
print("These rows should be moved to texts_constant.csv")

# Also check for rows that are mostly identical (more than 90% same)
print("\n" + "="*60)
print("Rows with mostly identical translations (>90% same):")
print()

mostly_identical = []
for row in data_rows:
    if len(row) < 2:
        continue

    key = row[0]
    values = row[1:-1]  # Exclude key and last column

    non_empty_values = [v.strip() for v in values if v.strip()]
    if len(non_empty_values) < 2:
        continue

    # Count frequency of each value
    from collections import Counter
    value_counts = Counter(non_empty_values)
    most_common_value, most_common_count = value_counts.most_common(1)[0]

    # Calculate percentage
    percentage = (most_common_count / len(non_empty_values)) * 100

    if percentage > 90 and len(value_counts) > 1:  # More than 90% same but not all same
        mostly_identical.append((key, most_common_value, percentage, len(value_counts)))

for key, value, percentage, unique_count in sorted(mostly_identical, key=lambda x: x[2], reverse=True):
    print(".1f")