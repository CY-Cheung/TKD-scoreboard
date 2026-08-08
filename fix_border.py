import re

with open('src/Pages/CourtSetup/CourtSetup.css', 'r', encoding='utf-8') as f:
    cs_css = f.read()

# Add hover states and !important to border-color in CourtSetup
old_block = """.datalist-input:focus, 
.form-group input[type="password"]:focus {
    outline: none;
    border-color: #FFFF00;"""

new_block = """.datalist-input:focus, 
.form-group input[type="password"]:focus,
.datalist-input:hover, 
.form-group input[type="password"]:hover {
    outline: none;
    border-color: #FFFF00 !important;"""

cs_css = cs_css.replace(old_block, new_block)

with open('src/Pages/CourtSetup/CourtSetup.css', 'w', encoding='utf-8') as f:
    f.write(cs_css)

with open('src/Pages/DataImport/DataImport.css', 'r', encoding='utf-8') as f:
    di_css = f.read()

# Fix blue and red box shadows to have !important and 0.8cqi
di_css = di_css.replace(
    'box-shadow: 0 0 0.417cqi rgba(66, 133, 244, 0.4);',
    'box-shadow: 0 0 0.8cqi rgba(66, 133, 244, 0.9) !important;'
)
di_css = di_css.replace(
    'box-shadow: 0 0 0.417cqi rgba(255, 59, 48, 0.4);',
    'box-shadow: 0 0 0.8cqi rgba(255, 59, 48, 0.9) !important;'
)

# Also ensure DataImport yellow border has !important
di_css = di_css.replace(
    'border-color: #FFFF00;',
    'border-color: #FFFF00 !important;'
)

with open('src/Pages/DataImport/DataImport.css', 'w', encoding='utf-8') as f:
    f.write(di_css)

print('Hover and border colors fixed!')
