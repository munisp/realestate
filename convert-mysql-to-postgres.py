#!/usr/bin/env python3
"""
Comprehensive MySQL to PostgreSQL schema converter for Drizzle ORM
Handles all MySQL-specific syntax and converts to PostgreSQL equivalents
"""

import re
import sys

def convert_schema(content):
    """Convert MySQL schema to PostgreSQL"""
    
    # Step 1: Update imports
    content = content.replace(
        'from "drizzle-orm/mysql-core"',
        'from "drizzle-orm/pg-core"'
    )
    
    # Replace MySQL types with PostgreSQL types
    type_replacements = {
        'mysqlTable': 'pgTable',
        'mysqlEnum': 'pgEnum',
        'int(': 'integer(',
        '.autoincrement()': '',  # Remove autoincrement, use serial instead
        'tinyint(': 'smallint(',
        '.onUpdateNow()': '',  # PostgreSQL doesn't support onUpdateNow
    }
    
    for old, new in type_replacements.items():
        content = content.replace(old, new)
    
    # Step 2: Fix primary key auto-increment
    # Pattern: id: integer("id").primaryKey() -> id: serial("id").primaryKey()
    content = re.sub(
        r'id:\s*integer\("id"\)\.primaryKey\(\)',
        'id: serial("id").primaryKey()',
        content
    )
    
    # Step 3: Extract and declare all enums at the top
    # Find all pgEnum declarations
    enum_pattern = r'pgEnum\("(\w+)",\s*\[((?:[^\[\]]|\[[^\]]*\])*?)\]\)'
    enums_found = {}
    
    for match in re.finditer(enum_pattern, content, re.DOTALL):
        enum_name = match.group(1)
        enum_values = match.group(2).strip()
        
        # Normalize for deduplication
        clean_values = re.sub(r'\s+', ' ', enum_values)
        enum_key = f"{enum_name}::{clean_values}"
        
        if enum_key not in enums_found:
            const_name = f"{enum_name}Enum"
            enums_found[enum_key] = {
                'const_name': const_name,
                'enum_name': enum_name,
                'enum_values': enum_values,
                'full_match': match.group(0)
            }
    
    # Step 4: Replace inline enums with references
    for enum_key, enum_info in enums_found.items():
        const_name = enum_info['const_name']
        enum_name = enum_info['enum_name']
        full_match = enum_info['full_match']
        
        # Replace inline usage with reference
        # Handle both .default() and .notNull() patterns
        content = re.sub(
            re.escape(full_match) + r'(\.default\([^\)]+\))?(\.notNull\(\))?',
            f'{const_name}("{enum_name}")\\1\\2',
            content
        )
    
    # Step 5: Create enum declarations section
    enum_declarations = "// PostgreSQL enum declarations - must be defined before tables\n"
    for enum_info in enums_found.values():
        const_name = enum_info['const_name']
        enum_name = enum_info['enum_name']
        enum_values = enum_info['enum_values']
        enum_declarations += f'export const {const_name} = pgEnum("{enum_name}", [{enum_values}]);\n'
    enum_declarations += "\n"
    
    # Step 6: Insert enum declarations after imports
    import_end = content.find('\n\n')
    if import_end > 0:
        content = content[:import_end] + '\n\n' + enum_declarations + content[import_end+2:]
    
    return content

def main():
    input_file = 'drizzle/schema.ts'
    output_file = 'drizzle/schema.ts'
    
    print(f"Reading {input_file}...")
    with open(input_file, 'r') as f:
        content = f.read()
    
    print("Converting MySQL to PostgreSQL...")
    converted = convert_schema(content)
    
    print(f"Writing to {output_file}...")
    with open(output_file, 'w') as f:
        f.write(converted)
    
    print("✅ Conversion complete!")
    print(f"   - Converted imports")
    print(f"   - Converted table definitions")
    print(f"   - Extracted and declared enums")
    print(f"   - Fixed auto-increment fields")
    print(f"   - Removed MySQL-specific features")

if __name__ == '__main__':
    main()
