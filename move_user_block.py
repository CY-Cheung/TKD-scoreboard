import re
import sys

def process_file(filepath, content_class):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Find the user block
    user_match = re.search(r'(\{user && \(\s*<div style=\{\{ position: \'absolute\'.*?</div>\s*\)\})', content, re.DOTALL)
    if not user_match:
        print(f'User block not found in {filepath}')
        return
    
    user_block = user_match.group(1)
    # Remove from original location
    content = content.replace(user_block, '')
    
    # Change top to bottom
    new_user_block = user_block.replace("top: '1.04cqi'", "bottom: '1.5cqi'")
    # Change right to right: 1.5cqi
    new_user_block = re.sub(r"right: '[^']+'", "right: '1.5cqi'", new_user_block)

    # Insert inside the content card
    insert_pos = content.find(f'<div className="{content_class} glass-card split-layout">')
    if insert_pos == -1:
        print(f'Content card not found in {filepath}')
        return
    
    # Find the end of this div tag
    end_of_div = content.find('>', insert_pos) + 1
    
    content = content[:end_of_div] + '\n' + new_user_block + content[end_of_div:]
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f'Updated {filepath}')

process_file('src/Pages/Home/Home.jsx', 'home-content')
process_file('src/Pages/CourtSetup/CourtSetup.jsx', 'cs-content')
