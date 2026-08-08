import re

with open('src/Pages/CourtSetup/CourtSetup.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('<div className="session-info-form">', '<div className="session-info-form" style={{ display: \'flex\', alignItems: \'center\', gap: \'0.8cqi\', padding: \'0.4cqi 0.8cqi\', borderRadius: \'1cqi\', border: \'1px solid rgba(255,255,255,0.15)\', backgroundColor: \'rgba(20,20,25,0.78)\', backdropFilter: \'blur(0.83cqi)\', zIndex: 50 }}>')

with open('src/Pages/CourtSetup/CourtSetup.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated session-info-form style in CourtSetup.jsx")
