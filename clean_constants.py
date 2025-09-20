import csv

# Read the constants file
constants_path = r"d:\Anarkade\Deliaxe Paint\vintage-palette-studio\src\locales\texts_constant.csv"

with open(constants_path, 'r', encoding='utf-8') as f:
    reader = csv.reader(f)
    rows = list(reader)

print(f"Original constants file has {len(rows)} rows")

# Remove duplicates while preserving order
seen = set()
unique_rows = []
for row in rows:
    # Create a tuple from the row to check for duplicates
    row_tuple = tuple(row)
    if row_tuple not in seen:
        seen.add(row_tuple)
        unique_rows.append(row)

print(f"After removing duplicates: {len(unique_rows)} rows")

# Write the cleaned file
with open(constants_path, 'w', encoding='utf-8', newline='') as f:
    writer = csv.writer(f)
    writer.writerows(unique_rows)

print("Cleaned texts_constant.csv - duplicates removed")