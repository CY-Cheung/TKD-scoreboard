import os
import re

for root, _, files in os.walk('src'):
    for file in files:
        if file.endswith('.jsx'):
            filepath = os.path.join(root, file)
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
                matches = re.findall(r'<Button[^>]*text=[\'"](.*?)[\'"]', content)
                for m in matches:
                    print(f'{filepath}: {m}')
