import os, re

for root_dir, _, files in os.walk('src'):
    for f in files:
        if f.endswith('.jsx') or f.endswith('.css'):
            path = os.path.join(root_dir, f)
            with open(path, 'r', encoding='utf-8') as file:
                content = file.read()
            
            orig_content = content
            
            # replace vw with cqi
            content = re.sub(r'([0-9]+\.?[0-9]*|\.[0-9]+)vw', r'\1cqi', content)
            
            if content != orig_content:
                with open(path, 'w', encoding='utf-8') as file:
                    file.write(content)
                print(f'Updated {path}')
