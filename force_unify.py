def update_css(filepath, target_class):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    override = f'''
/* FORCED UNIFICATION */
{target_class} {{
    height: 2.8cqi !important;
    padding: 0 0.8cqi !important;
    line-height: 2.8cqi !important;
    box-sizing: border-box !important;
    font-size: 1.2cqi !important;
}}
'''
    with open(filepath, 'a', encoding='utf-8') as f:
        f.write(override)

update_css('src/Pages/CourtSetup/CourtSetup.css', '.datalist-input, .form-group input[type="password"]')
update_css('src/Pages/DataImport/DataImport.css', '.form-group input, .form-group select')

print('Appended overrides.')
