import re

with open('src/Components/QRCodeDisplay/QRCodeDisplay.css', 'r', encoding='utf-8') as f:
    css = f.read()

# 1. Update modal overlay width
css = css.replace('width: 100cqi;', 'width: 100vw;')

# 2. Shrink card
css = css.replace('max-width: 65cqi;', 'max-width: 55cqi;')

# 3. Update left panel padding and alignment
left_panel_old = '''.qrcode-left-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 2.083cqi;
  text-align: left;
}'''
left_panel_new = '''.qrcode-left-panel {
  flex: 1 1 50%;
  width: 50%;
  max-width: 50%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  padding: 4.5cqi;
  text-align: left;
  justify-content: center;
  gap: 2.5cqi;
}'''
css = css.replace(left_panel_old, left_panel_new)

# 4. Update right panel padding
right_panel_old = '''.qrcode-right-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 2.083cqi;
  justify-content: space-between;
}'''
right_panel_new = '''.qrcode-right-panel {
  flex: 1 1 50%;
  width: 50%;
  max-width: 50%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  padding: 4.5cqi;
  justify-content: center;
}'''
css = css.replace(right_panel_old, right_panel_new)

# 5. Update qrcode-wrapper
wrapper_old = '''.qrcode-wrapper {
  background: rgba(255, 255, 255, 0.95);
  padding: 0.625cqi;
  border-radius: 0.833cqi;
  box-shadow: 0 0.417cqi 1.667cqi rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255,255,255,0.2);
  display: flex;
  justify-content: center;
  align-items: center;
}'''
wrapper_new = '''.qrcode-wrapper {
  background: rgba(255, 255, 255, 0.95);
  padding: 1.5cqi;
  border-radius: 1.5cqi;
  box-shadow: 0 0.417cqi 1.667cqi rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255,255,255,0.2);
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  aspect-ratio: 1;
  box-sizing: border-box;
}'''
css = css.replace(wrapper_old, wrapper_new)

with open('src/Components/QRCodeDisplay/QRCodeDisplay.css', 'w', encoding='utf-8') as f:
    f.write(css)

print('Updated QRCodeDisplay.css')
