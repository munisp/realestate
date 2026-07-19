#!/usr/bin/env python3
import re
import sys
from pathlib import Path

def extract_and_fix_enums(file_path):
    """Extract inline pgEnum declarations and move them to the top of the file."""
    with open(file_path, 'r') as f:
        content = f.read()
    
    # Find all inline pgEnum declarations
    # Pattern: pgEnum("enumName", ["value1", "value2", ...])
    inline_enum_pattern = r'pgEnum\("([^"]+)",\s*\[([^\]]+)\]\)'
    
    enums_found = []
    enum_replacements = {}
    
    for match in re.finditer(inline_enum_pattern, content):
        enum_name = match.group(1)
        enum_values = match.group(2)
        full_match = match.group(0)
        
        # Create a unique variable name
        var_name = f"{enum_name}Enum_{hash(enum_name) % 100000:05d}"
        
        # Store the enum declaration
        enums_found.append(f'export const {var_name} = pgEnum("{enum_name}", [{enum_values}]);')
        
        # Store replacement mapping
        enum_replacements[full_match] = f'{var_name}("{enum_name}")'
    
    if not enums_found:
        return False  # No changes needed
    
    # Replace inline enums with references
    new_content = content
    for old, new in enum_replacements.items():
        new_content = new_content.replace(old, new)
    
    # Find the import statement and add enum declarations after it
    import_pattern = r'(import\s+{[^}]+}\s+from\s+"drizzle-orm/pg-core";)'
    import_match = re.search(import_pattern, new_content)
    
    if import_match:
        enum_section = "\n\n// ==================== ENUM DEFINITIONS ====================\n"
        enum_section += "// PostgreSQL requires enums to be declared separately before use\n\n"
        enum_section += "\n".join(enums_found) + "\n\n"
        enum_section += "// ==================== TABLE DEFINITIONS ====================\n"
        
        insert_pos = import_match.end()
        new_content = new_content[:insert_pos] + enum_section + new_content[insert_pos:]
    
    # Write back
    with open(file_path, 'w') as f:
        f.write(new_content)
    
    return True

if __name__ == "__main__":
    schema_dir = Path("/home/ubuntu/realestate-platform/drizzle")
    
    for schema_file in schema_dir.glob("schema-*.ts"):
        if "backup" not in schema_file.name:
            print(f"Processing {schema_file.name}...")
            if extract_and_fix_enums(schema_file):
                print(f"  ✓ Fixed inline enums in {schema_file.name}")
            else:
                print(f"  - No inline enums found in {schema_file.name}")
