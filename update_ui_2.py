import re

# 1. Update Home padding
with open('src/Pages/Home/Home.css', 'r', encoding='utf-8') as f:
    home_css = f.read()
home_css = home_css.replace('padding: 4cqi;', 'padding: 6cqi;')
with open('src/Pages/Home/Home.css', 'w', encoding='utf-8') as f:
    f.write(home_css)

# 2. Update CourtSetup padding and focus
with open('src/Pages/CourtSetup/CourtSetup.css', 'r', encoding='utf-8') as f:
    cs_css = f.read()
cs_css = cs_css.replace('padding: 3.5cqi 3cqi;', 'padding: 5cqi 4cqi;')
cs_css = cs_css.replace('box-shadow: 0 0 0.42cqi rgba(255, 255, 0, 0.4);', 'box-shadow: 0 0 0.8cqi rgba(255, 255, 0, 0.9) !important;')
with open('src/Pages/CourtSetup/CourtSetup.css', 'w', encoding='utf-8') as f:
    f.write(cs_css)

# 3. Update DataImport padding and focus
with open('src/Pages/DataImport/DataImport.css', 'r', encoding='utf-8') as f:
    di_css = f.read()
di_css = di_css.replace('padding: 2cqi 2.5cqi;', 'padding: 3cqi 4cqi;')
di_css = di_css.replace('box-shadow: 0 0 0.417cqi rgba(255, 255, 0, 0.4);', 'box-shadow: 0 0 0.8cqi rgba(255, 255, 0, 0.9) !important;')
with open('src/Pages/DataImport/DataImport.css', 'w', encoding='utf-8') as f:
    f.write(di_css)

# 4. Fix DataImport JSX inline styles for list item
with open('src/Pages/DataImport/DataImport.jsx', 'r', encoding='utf-8') as f:
    di_jsx = f.read()

di_jsx = di_jsx.replace(
    '''<li key={mId} onClick={() => setSelectedMatchId(mId)} className={selectedMatchId === mId ? 'selected' : ''} style={{ padding: '0.42cqi 0.52cqi' }}>
                                            <div style={{ fontSize: '0.72cqi', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>''',
    '''<li key={mId} onClick={() => setSelectedMatchId(mId)} className={selectedMatchId === mId ? 'selected' : ''}>
                                            <div style={{ fontSize: '1cqi', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>'''
)

di_jsx = di_jsx.replace(
    '''<span style={{ color: '#fff', margin: '0 0.31cqi', fontSize: '0.64cqi' }}>VS</span>''',
    '''<span style={{ color: '#fff', margin: '0 0.5cqi', fontSize: '1cqi' }}>VS</span>'''
)

with open('src/Pages/DataImport/DataImport.jsx', 'w', encoding='utf-8') as f:
    f.write(di_jsx)

print('Updated paddings, focus colors, and list item inline fonts.')
