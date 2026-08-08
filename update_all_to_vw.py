import os, re

def px_to_vw(match):
    val_str = match.group(1)
    if val_str == '.': return match.group(0)
    val = float(val_str)
    if val <= 2.0:
        return match.group(0) # keep 1px, 2px as is
    new_val = round(val * 0.052, 2)
    if new_val == int(new_val):
        new_val = int(new_val)
    return f'{new_val}vw'

def rem_to_vw(match):
    val_str = match.group(1)
    if val_str == '.': return match.group(0)
    val = float(val_str)
    new_val = round(val * 0.85, 2)
    if new_val == int(new_val):
        new_val = int(new_val)
    return f'{new_val}vw'

def cqi_to_vw(match):
    val_str = match.group(1)
    if val_str == '.': return match.group(0)
    val = float(val_str)
    new_val = round(val * 1.0, 2) # cqi -> vw 1:1 roughly for full screen container
    if new_val == int(new_val):
        new_val = int(new_val)
    return f'{new_val}vw'

def size_to_vw(match):
    val_str = match.group(1)
    if val_str == '.': return match.group(0)
    val = float(val_str)
    if val <= 2.0:
        return match.group(0)
    new_val = round(val * 0.052, 2)
    if new_val == int(new_val):
        new_val = int(new_val)
    return f'size="{new_val}vw"'

dirs_to_check = ['src/Pages/Home', 'src/Pages/CourtSetup']

for root, _, files in os.walk('src'):
    normalized_root = root.replace('\\', '/')
    if not any(d in normalized_root for d in dirs_to_check):
        continue
    for f in files:
        if f.endswith('.jsx') or f.endswith('.css'):
            path = os.path.join(root, f)
            with open(path, 'r', encoding='utf-8') as file:
                content = file.read()
            
            orig_content = content
            
            content = re.sub(r'([0-9]+\.?[0-9]*|\.[0-9]+)px', px_to_vw, content)
            content = re.sub(r'([0-9]+\.?[0-9]*|\.[0-9]+)rem', rem_to_vw, content)
            content = re.sub(r'([0-9]+\.?[0-9]*|\.[0-9]+)cqi', cqi_to_vw, content)
            content = re.sub(r'size=\{([0-9]+\.?[0-9]*|\.[0-9]+)\}', size_to_vw, content)
            
            if content != orig_content:
                with open(path, 'w', encoding='utf-8') as file:
                    file.write(content)
                print(f'Updated {path}')
