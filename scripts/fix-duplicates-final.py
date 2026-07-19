#!/usr/bin/env python3
"""
Remove duplicate inline router definitions from routers.ts
Keep only the imported routers
"""

import re

def remove_inline_router(content, router_name, start_line_approx):
    """
    Remove an inline router definition by finding its start and matching closing brace
    """
    lines = content.split('\n')
    
    # Find the exact line with the router definition
    pattern = f"^  {router_name}: router\\({{"
    start_idx = None
    
    for i, line in enumerate(lines):
        if re.match(pattern, line) and i >= start_line_approx - 10 and i <= start_line_approx + 10:
            start_idx = i
            break
    
    if start_idx is None:
        print(f"Could not find inline router: {router_name} near line {start_line_approx}")
        return content
    
    # Count braces to find the end
    brace_count = 0
    end_idx = None
    
    for i in range(start_idx, len(lines)):
        line = lines[i]
        brace_count += line.count('{')
        brace_count -= line.count('}')
        
        if brace_count == 0 and i > start_idx:
            # Check if next line is closing the router with }),
            if i + 1 < len(lines) and lines[i + 1].strip().startswith('}'):
                end_idx = i + 1
            else:
                end_idx = i
            break
    
    if end_idx is None:
        print(f"Could not find end of inline router: {router_name}")
        return content
    
    print(f"Removing {router_name} inline router from lines {start_idx + 1} to {end_idx + 1}")
    
    # Remove the lines
    del lines[start_idx:end_idx + 1]
    
    # Also remove the trailing comma if it's on its own line
    if start_idx < len(lines) and lines[start_idx].strip() == '),':
        del lines[start_idx]
    
    return '\n'.join(lines)

def main():
    with open('/home/ubuntu/realestate-platform/server/routers.ts', 'r') as f:
        content = f.read()
    
    # List of inline routers to remove (router_name, approximate_line_number)
    # Process from bottom to top so line numbers don't shift
    inline_routers = [
        ('messages', 2339),
        ('alerts', 2263),
        ('analytics', 1999),
        ('notifications', 1947),
        ('documents', 1588),
        ('analytics', 1536),
        ('documents', 894),
        ('virtualTours', 860),
        ('notifications', 806),
        ('messages', 702),
    ]
    
    for router_name, line_num in inline_routers:
        content = remove_inline_router(content, router_name, line_num)
    
    with open('/home/ubuntu/realestate-platform/server/routers.ts', 'w') as f:
        f.write(content)
    
    print("Done! Removed all duplicate inline routers.")

if __name__ == '__main__':
    main()
