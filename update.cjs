const fs = require('fs');

function updateFile(filePath) {
    let code = fs.readFileSync(filePath, 'utf-8');

    // Add UI block to DataImport if not already added
    if (filePath.includes('DataImport') && !code.includes('Point Gap')) {
        // Add states
        if (!code.includes('newMaxPointGap')) {
            code = code.replace(
                /const \[newSetupPassword, setNewSetupPassword\] = useState\('BCB2026'\);/,
                `const [newSetupPassword, setNewSetupPassword] = useState('BCB2026');
  const [newMaxPointGap, setNewMaxPointGap] = useState(12);
  const [newMaxGamjeom, setNewMaxGamjeom] = useState(5);
  const [newRoundDuration, setNewRoundDuration] = useState(120);
  const [newRestDuration, setNewRestDuration] = useState(60);`
            );
        }

        // Replace all settings objects
        code = code.replace(/settings: \{ setupPassword: newSetupPassword \|\| 'BCB2026' \}/g, `settings: { 
                            setupPassword: newSetupPassword || 'BCB2026',
                            maxPointGap: parseInt(newMaxPointGap, 10) || 12,
                            maxGamjeom: parseInt(newMaxGamjeom, 10) || 5,
                            roundDuration: parseInt(newRoundDuration, 10) || 120,
                            restDuration: parseInt(newRestDuration, 10) || 60
                        }`);

        // Add state resets
        code = code.replace(/setNewSetupPassword\('BCB2026'\);/g, `setNewSetupPassword('BCB2026');
      setNewMaxPointGap(12);
      setNewMaxGamjeom(5);
      setNewRoundDuration(120);
      setNewRestDuration(60);`);

        const uiBlockDI = `              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>`;
        const replaceUIDI = `              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '15px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ color: '#ccc', fontSize: '0.85rem' }}>Point Gap (分差)</label>
                  <input type="number" value={newMaxPointGap} onChange={e => setNewMaxPointGap(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #555', backgroundColor: '#333', color: '#fff' }} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ color: '#ccc', fontSize: '0.85rem' }}>Max Gam-jeom (犯規上限)</label>
                  <input type="number" value={newMaxGamjeom} onChange={e => setNewMaxGamjeom(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #555', backgroundColor: '#333', color: '#fff' }} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ color: '#ccc', fontSize: '0.85rem' }}>Round Duration (回合秒數)</label>
                  <input type="number" value={newRoundDuration} onChange={e => setNewRoundDuration(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #555', backgroundColor: '#333', color: '#fff' }} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ color: '#ccc', fontSize: '0.85rem' }}>Rest Duration (休息秒數)</label>
                  <input type="number" value={newRestDuration} onChange={e => setNewRestDuration(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #555', backgroundColor: '#333', color: '#fff' }} />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '15px' }}>`;
        code = code.replace(uiBlockDI, replaceUIDI);
    }

    fs.writeFileSync(filePath, code);
}

updateFile('src/Pages/DataImport/DataImport.jsx');
