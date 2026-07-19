#!/usr/bin/env python3
import re

# Read the schema file
with open('/home/ubuntu/realestate-platform/drizzle/schema.ts', 'r') as f:
    content = f.read()

# Step 1: Fix inline pgEnum usage - PostgreSQL requires enums to be declared separately
# Extract all unique enum declarations
enum_pattern = r'pgEnum\("(\w+)",\s*\[(.*?)\]\)'
enums_found = {}

for match in re.finditer(enum_pattern, content):
    enum_name = match.group(1)
    enum_values = match.group(2)
    if enum_name not in enums_found:
        enums_found[enum_name] = enum_values

# Create enum declarations
enum_declarations = "// PostgreSQL enum declarations - must be defined before tables\n"
enum_replacements = {}

for enum_name, enum_values in enums_found.items():
    # Create unique enum constant name
    enum_const_name = f"{enum_name}Enum"
    enum_declarations += f'export const {enum_const_name} = pgEnum("{enum_name}", [{enum_values}]);\n'
    enum_replacements[f'pgEnum("{enum_name}", [{enum_values}])'] = enum_const_name

# Step 2: Replace inline enums with references
for old_enum, new_enum in enum_replacements.items():
    content = content.replace(old_enum, new_enum)

# Step 3: Insert enum declarations after imports
import_end = content.find('\n\n')
content = content[:import_end] + '\n\n' + enum_declarations + content[import_end:]

# Write the updated schema
with open('/home/ubuntu/realestate-platform/drizzle/schema.ts', 'w') as f:
    f.write(content)

print(f"Converted {len(enums_found)} enum types")
print("Enum names:", list(enums_found.keys()))
