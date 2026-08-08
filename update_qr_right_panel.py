import re

with open('src/Components/QRCodeDisplay/QRCodeDisplay.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Update regex and JSX logic for the text formatting
old_logic = '''              {(() => {
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
              })()}'''

new_logic = '''              {(() => {
                const full = eventName || eventId || "N/A";
                const dayMatch = full.match(/(.*?)\s*\(Day (\d+)\)\s*\((\d{4}\/\d{2}\/\d{2})\)/i);
                const formatCourt = (cid) => cid ? cid.toString().replace(/court\s*/i, '').trim() : "N/A";
                
                if (dayMatch) {
                  return (
                    <>
                      <div style={{ fontSize: '1.6cqi', fontWeight: 'bold', color: '#fff' }}>{dayMatch[1].trim()}</div>
                      <div style={{ fontSize: '1.6cqi', fontWeight: 'bold', color: '#fff', marginTop: '0.4cqi' }}>Day {dayMatch[2]} - {dayMatch[3]} - Court {formatCourt(courtId)}</div>
                    </>
                  );
                }
                return (
                    <>
                      <div style={{ fontSize: '1.6cqi', fontWeight: 'bold', color: '#fff' }}>{full}</div>
                      <div style={{ fontSize: '1.6cqi', fontWeight: 'bold', color: '#fff', marginTop: '0.4cqi' }}>Court {formatCourt(courtId)}</div>
                    </>
                );
              })()}'''

content = content.replace(old_logic, new_logic)

# Shrink QR code wrapper
content = content.replace('className="qrcode-wrapper" style={{ width: "70%", aspectRatio: "1" }}', 'className="qrcode-wrapper" style={{ width: "55%", aspectRatio: "1" }}')

with open('src/Components/QRCodeDisplay/QRCodeDisplay.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

with open('src/Components/QRCodeDisplay/QRCodeDisplay.css', 'r', encoding='utf-8') as f:
    css = f.read()

# Update instructions text font
css = css.replace('font-size: 1.4cqi;\n  color: rgba(255, 255, 255, 0.7);', 'font-size: 1.6cqi;\n  font-weight: bold;\n  color: #fff;')

with open('src/Components/QRCodeDisplay/QRCodeDisplay.css', 'w', encoding='utf-8') as f:
    f.write(css)

print("Updated QRCodeDisplay right panel")
