import re

# 1. Update Home padding
with open('src/Pages/Home/Home.css', 'r', encoding='utf-8') as f:
    home_css = f.read()
home_css = home_css.replace('padding: 3cqi;', 'padding: 4cqi;')
with open('src/Pages/Home/Home.css', 'w', encoding='utf-8') as f:
    f.write(home_css)

# 2. Update CourtSetup padding
with open('src/Pages/CourtSetup/CourtSetup.css', 'r', encoding='utf-8') as f:
    cs_css = f.read()
cs_css = cs_css.replace('padding: 2.6cqi 2.08cqi;', 'padding: 3.5cqi 3cqi;')
with open('src/Pages/CourtSetup/CourtSetup.css', 'w', encoding='utf-8') as f:
    f.write(cs_css)

# 3. Update DataImport padding and Match list CSS
with open('src/Pages/DataImport/DataImport.css', 'r', encoding='utf-8') as f:
    di_css = f.read()
di_css = di_css.replace('padding: 1.042cqi 1.562cqi;', 'padding: 2cqi 2.5cqi;')

di_css = di_css.replace(
'''.matches-list li {
    padding: 0.521cqi 0.625cqi;''',
'''.matches-list li {
    padding: 0 1cqi;
    height: 2.8cqi;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    font-size: 1cqi !important;'''
)
with open('src/Pages/DataImport/DataImport.css', 'w', encoding='utf-8') as f:
    f.write(di_css)

# 4. Update DataImport JSX for bracket zoom buttons and list font sizes
with open('src/Pages/DataImport/DataImport.jsx', 'r', encoding='utf-8') as f:
    di_jsx = f.read()

di_jsx = di_jsx.replace(
    'fontSize="1.02cqi"',
    'fontSize="0.8cqi"'
)
di_jsx = di_jsx.replace(
    '<span style={{ color: \'#fff\', minWidth: \'2.6cqi\', textAlign: \'center\', fontWeight: \'bold\' }}>',
    '<span style={{ color: \'#fff\', minWidth: \'2.6cqi\', textAlign: \'center\', fontWeight: \'bold\', fontSize: \'0.8cqi\' }}>'
)
di_jsx = di_jsx.replace(
    '<span style={{ fontSize: \'0.94cqi\', color: \'#ccc\' }}>',
    '<span style={{ fontSize: \'1cqi\', color: \'#ccc\' }}>'
)

with open('src/Pages/DataImport/DataImport.jsx', 'w', encoding='utf-8') as f:
    f.write(di_jsx)

print('Updated paddings, bracket zoom UI, and matches list UI.')
