import os

def insert_fullscreen_handler(filepath, target_line):
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()
        
    func_str = """
    const toggleFullScreen = (e) => {
        if (e.target === e.currentTarget) {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(err => console.log(err));
            } else {
                document.exitFullscreen();
            }
        }
    };
"""
    
    # find where to insert the function (just before return)
    # find the target_line and insert the attribute
    for i, line in enumerate(lines):
        if target_line in line:
            # insert attribute
            lines[i] = line.replace(target_line, target_line[:-1] + ' onDoubleClick={toggleFullScreen}>')
            
            # backtrack to find the closest return
            for j in range(i-1, -1, -1):
                if 'return (' in lines[j] or 'return(' in lines[j]:
                    lines.insert(j, func_str)
                    break
            break
            
    with open(filepath, 'w', encoding='utf-8') as f:
        f.writelines(lines)


insert_fullscreen_handler('src/Pages/Home/Home.jsx', '<div className="home aurora-bg">')
insert_fullscreen_handler('src/Pages/CourtSetup/CourtSetup.jsx', '<div className="cs-container aurora-bg">')
insert_fullscreen_handler('src/Pages/DataImport/DataImport.jsx', '<div className="di-container aurora-bg">')

print("Fullscreen handlers added.")
