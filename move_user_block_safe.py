def process(filepath, content_class):
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()
        
    start_idx = -1
    for i, line in enumerate(lines):
        if '{user && (' in line:
            start_idx = i
            break
            
    if start_idx != -1:
        end_idx = -1
        for i in range(start_idx, len(lines)):
            if f'className="{content_class} glass-card split-layout"' in lines[i]:
                end_idx = i
                break
                
        if end_idx != -1:
            user_block_lines = lines[start_idx:end_idx]
            user_block_str = ''.join(user_block_lines)
            
            del lines[start_idx:end_idx]
            
            modified = user_block_str.replace("top: '1.04cqi'", "bottom: '1.5cqi'").replace("right: '1.04cqi'", "right: '1.5cqi'")
            
            insert_idx = -1
            for i, line in enumerate(lines):
                if f'className="{content_class} glass-card split-layout"' in line:
                    insert_idx = i + 1
                    break
                    
            lines.insert(insert_idx, modified)
            
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(''.join(lines))
            print(f'Successfully moved user block in {filepath}')

process('src/Pages/Home/Home.jsx', 'home-content')
process('src/Pages/CourtSetup/CourtSetup.jsx', 'cs-content')
