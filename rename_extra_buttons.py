import os
import re

replacements = {
    'Log Out': 'Logout (登出)',
    'Continue with Google': 'Google (登入)',
    'Reset': 'Reset (重置)',
    'Done': 'Done (完成)',
    'Declare Round Winner': 'Winner (判定勝負)'
}

for root, _, files in os.walk('src'):
    for file in files:
        if file.endswith('.jsx'):
            filepath = os.path.join(root, file)
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
            
            modified = False
            for old_text, new_text in replacements.items():
                # Replace exact match text="Old Text" with text="New Text"
                pattern = f'text="{old_text}"'
                if pattern in content:
                    content = content.replace(pattern, f'text="{new_text}"')
                    modified = True
                
                pattern2 = f"text='{old_text}'"
                if pattern2 in content:
                    content = content.replace(pattern2, f"text='{new_text}'")
                    modified = True
            
            if modified:
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(content)
                print(f"Updated {filepath}")

