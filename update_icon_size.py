import re

with open('src/Pages/CourtSetup/CourtSetup.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

def size_to_vw(match):
    val = float(match.group(1))
    new_val = round(val * 0.052, 2)
    return f'size="{new_val}vw"'

content = re.sub(r'size=\{([0-9.]+)\}', size_to_vw, content)

with open('src/Pages/CourtSetup/CourtSetup.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
