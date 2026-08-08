import re

with open('src/Pages/CourtSetup/CourtSetup.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

def replacer(match):
    prefix = match.group(1) # e.g. fontSize: ' or fontSize=\"
    val = float(match.group(2))
    suffix = match.group(4) # e.g. ' or \"
    
    new_val = round(val * 0.85, 2)
    return f'{prefix}{new_val}vw{suffix}'

content = re.sub(r'(fontSize(?:[:=]\s*[\'\"]|:\s*\'))([0-9.]+)(rem)([\'\"])', replacer, content)

with open('src/Pages/CourtSetup/CourtSetup.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
