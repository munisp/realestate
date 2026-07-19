#!/usr/bin/env python3
import re
import hashlib

def convert_schema(content):
    # Step 1: Update imports
    content = content.replace('from "drizzle-orm/mysql-core"', 'from "drizzle-orm/pg-core"')
    
    # Replace MySQL types
    replacements = {
        'mysqlTable': 'pgTable',
        'mysqlEnum': 'pgEnum',
        'int(': 'integer(',
        'tinyint(': 'smallint(',
        '.onUpdateNow()': '',
    }
    for old, new in replacements.items():
        content = content.replace(old, new)
    
    # Fix auto-increment primary keys
    content = re.sub(r'id:\s*integer\("id"\)\.primaryKey\(\)', 'id: serial("id").primaryKey()', content)
    
    # Step 2: Extract all enums with unique names
    enum_pattern = r'pgEnum\("(\w+)",\s*\[((?:[^\[\]]|\[[^\]]*\])*?)\]\)'
    enums_found = {}
    enum_name_counter = {}
    
    matches = list(re.finditer(enum_pattern, content, re.DOTALL))
    
    for match in matches:
        enum_name = match.group(1)
        enum_values = match.group(2).strip()
        
        # Create hash of values for uniqueness
        values_hash = hashlib.md5(enum_values.encode()).hexdigest()[:8]
        enum_key = f"{enum_name}_{values_hash}"
        
        if enum_key not in enums_found:
            # Create unique const name
            if enum_name not in enum_name_counter:
                enum_name_counter[enum_name] = 0
                const_name = f"{enum_name}Enum"
            else:
                enum_name_counter[enum_name] += 1
                const_name = f"{enum_name}{enum_name_counter[enum_name]}Enum"
            
            enums_found[enum_key] = {
                'const_name': const_name,
                'enum_name': enum_name,
                'enum_values': enum_values,
                'pattern': match.group(0)
            }
    
    # Step 3: Replace inline enums with references
    for enum_info in enums_found.values():
        pattern = re.escape(enum_info['pattern'])
        replacement = f'{enum_info["const_name"]}("{enum_info["enum_name"]}")'
        content = re.sub(pattern, replacement, content)
    
    # Step 4: Create enum declarations
    enum_declarations = "// PostgreSQL enum declarations\n"
    for enum_info in enums_found.values():
        enum_declarations += f'export const {enum_info["const_name"]} = pgEnum("{enum_info["enum_name"]}", [{enum_info["enum_values"]}]);\n'
    enum_declarations += "\n"
    
    # Insert after imports
    import_end = content.find('\n\n')
    if import_end > 0:
        content = content[:import_end] + '\n\n' + enum_declarations + content[import_end+2:]
    
    return content, len(enums_found)

# Main execution
with open('drizzle/schema.ts', 'r') as f:
    content = f.read()

converted, enum_count = convert_schema(content)

with open('drizzle/schema.ts', 'w') as f:
    f.write(converted)

print(f"✅ Converted {enum_count} unique enums")
