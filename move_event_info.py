import re

with open('src/Components/QRCodeDisplay/QRCodeDisplay.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Remove qrcode-info block from left panel
# The qrcode-info block starts at <div className="qrcode-info" and ends before {/* Real-time Referee Connection Status Badge Panel */}
info_pattern = r'<div className="qrcode-info".*?</div>\s*(?=</?div>|<div\s*className=\{\`referee-status-box)'
# Wait, it contains a nested div (or span) so regex might be tricky. Let's use simple string replacement since we know the exact string.

# Let's extract the exact left panel info block to replace
left_panel_info = '''          <div className="qrcode-info" style={{ marginTop: "0.52cqi", display: "flex", flexWrap: "wrap", gap: "0.42cqi" }}>
            <span className="qrcode-badge">
              {(() => {
                const full = eventName || eventId || "N/A";
                const dayMatch = full.match(/(.*?)\s*(\(Day \d+\)\s*\(\d{4}\/\d{2}\/\d{2}\))/i);
                if (dayMatch) {
                  return (
                    <>
                      Event:<br/>
                      <span style={{ fontSize: '1.05em', display: 'inline-block', margin: '0.16cqi 0' }}>{dayMatch[1].trim()}</span><br/>
                      <span style={{ fontSize: '0.85em', opacity: 0.8 }}>{dayMatch[2].trim()}</span>
                    </>
                  );
                }
                return `Event: ${full}`;
              })()}
            </span>
            <span className="qrcode-badge court" style={{ height: "fit-content" }}>
              Court: {courtId || "N/A"}
            </span>
          </div>'''

content = content.replace(left_panel_info, '')

# 2. Insert the title block in the right panel and shrink QR code
right_panel_old = '''        {/* Right Panel: QR Code and Config */}
        <div className="qrcode-right-panel">
          {/* Network Host Config Section (Removed) */}

          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.78cqi",
            }}
          >
            <div className="qrcode-wrapper">'''

right_panel_new = '''        {/* Right Panel: QR Code and Config */}
        <div className="qrcode-right-panel">
          {/* Network Host Config Section (Removed) */}

          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.78cqi",
            }}
          >
            <div style={{ textAlign: "center", marginBottom: "1.5cqi" }}>
              {(() => {
                const full = eventName || eventId || "N/A";
                const dayMatch = full.match(/(.*?)\s*(\(Day \d+\)\s*\(\d{4}\/\d{2}\/\d{2}\))/i);
                if (dayMatch) {
                  return (
                    <>
                      <div style={{ fontSize: '1.6cqi', fontWeight: 'bold', color: '#fff' }}>{dayMatch[1].trim()}</div>
                      <div style={{ fontSize: '1.1cqi', opacity: 0.7, color: '#cbd5e1', marginTop: '0.4cqi' }}>{dayMatch[2].trim()} • Court {courtId || "N/A"}</div>
                    </>
                  );
                }
                return (
                    <>
                      <div style={{ fontSize: '1.6cqi', fontWeight: 'bold', color: '#fff' }}>{full}</div>
                      <div style={{ fontSize: '1.1cqi', opacity: 0.7, color: '#cbd5e1', marginTop: '0.4cqi' }}>Court {courtId || "N/A"}</div>
                    </>
                );
              })()}
            </div>
            
            <div className="qrcode-wrapper" style={{ width: "70%", aspectRatio: "1" }}>'''

content = content.replace(right_panel_old, right_panel_new)

with open('src/Components/QRCodeDisplay/QRCodeDisplay.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated QRCodeDisplay.jsx for new layout")
