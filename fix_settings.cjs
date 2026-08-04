
const fs = require('fs');

function replaceExact(filePath) {
    let code = fs.readFileSync(filePath, 'utf-8');
    const target = \settings: { setupPassword: newSetupPassword || 'BCB2026' }\;
    const replacement = \settings: { 
                        setupPassword: newSetupPassword || 'BCB2026',
                        maxPointGap: parseInt(newMaxPointGap, 10) || 12,
                        maxGamjeom: parseInt(newMaxGamjeom, 10) || 5,
                        roundDuration: parseInt(newRoundDuration, 10) || 120,
                        restDuration: parseInt(newRestDuration, 10) || 60
                    }\;
    
    code = code.split(target).join(replacement);
    fs.writeFileSync(filePath, code);
    console.log('Fixed', filePath);
}

replaceExact('src/Pages/CourtSetup/CourtSetup.jsx');
replaceExact('src/Pages/DataImport/DataImport.jsx');

