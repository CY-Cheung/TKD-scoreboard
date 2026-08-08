import re

with open('src/Components/QRCodeDisplay/QRCodeDisplay.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Remove qrcode-url-box block
url_box_pattern = r'<div className="qrcode-url-box">.*?</div>\s*</div>'
content = re.sub(url_box_pattern, '</div>', content, flags=re.DOTALL)

# Update QRCodeSVG size to 100% and add style width/height 100%
content = content.replace('size="11.44cqi"', 'size="100%" style={{ width: \'100%\', height: \'100%\' }}')

# Remove auto margins from referee-status-box
content = content.replace('style={{ marginTop: "auto", marginBottom: "auto" }}', '')

with open('src/Components/QRCodeDisplay/QRCodeDisplay.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated QRCodeDisplay.jsx")
