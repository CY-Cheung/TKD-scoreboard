import os
import re

replacements = {
    'Change Court Session': 'Court Setup (場地設置)',
    'Screen': 'Screen (顯示屏)',
    'Admin': 'Admin (管理後台)',
    'Referee': 'Referee (裁判控制)',
    
    'Create Event': 'Create (新增)',
    'Delete Event': 'Delete (刪除)',
    'Confirm Settings': 'Confirm (確認)',
    
    'Add Match': 'Add Match (新增賽事)',
    'Load to Screen': 'Load (載入)',
    'Back to Home': 'Home (主頁)',
    'View Bracket': 'Bracket (賽程表)',
    
    'Single Referee': 'Single (單裁判)',
    'Multiple Referees': 'Multiple (多裁判)',
    
    'Go Back': 'Back (返回)',
    'Back': 'Back (返回)',
    
    'Cancel': 'Cancel (取消)',
    'Confirm': 'Confirm (確認)'
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

