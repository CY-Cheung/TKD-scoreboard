import re

# 1. Update CourtSetup.jsx labels
with open('src/Pages/CourtSetup/CourtSetup.jsx', 'r', encoding='utf-8') as f:
    cs_jsx = f.read()
cs_jsx = cs_jsx.replace("fontSize: '0.94cqi'", "fontSize: '1cqi'")
with open('src/Pages/CourtSetup/CourtSetup.jsx', 'w', encoding='utf-8') as f:
    f.write(cs_jsx)

# 2. Update DataImport.css labels
with open('src/Pages/DataImport/DataImport.css', 'r', encoding='utf-8') as f:
    di_css = f.read()
di_css = di_css.replace('font-size: 0.94cqi;', 'font-size: 1cqi !important;')
with open('src/Pages/DataImport/DataImport.css', 'w', encoding='utf-8') as f:
    f.write(di_css)

# 3. Update the forced unification font sizes
with open('src/Pages/CourtSetup/CourtSetup.css', 'r', encoding='utf-8') as f:
    cs_css = f.read()
cs_css = cs_css.replace('font-size: 1.2cqi !important;', 'font-size: 1cqi !important;')
with open('src/Pages/CourtSetup/CourtSetup.css', 'w', encoding='utf-8') as f:
    f.write(cs_css)

with open('src/Pages/DataImport/DataImport.css', 'r', encoding='utf-8') as f:
    di_css2 = f.read()
di_css2 = di_css2.replace('font-size: 1.2cqi !important;', 'font-size: 1cqi !important;')
with open('src/Pages/DataImport/DataImport.css', 'w', encoding='utf-8') as f:
    f.write(di_css2)

print('Everything set to exactly 1cqi!')
