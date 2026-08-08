import re

with open('src/Pages/Screen/Screen.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add eventName prop to QRCodeDisplay
content = re.sub(
    r'(<QRCodeDisplay\s+.*?eventId=\{selectedEvent\})',
    r'\1\n        eventName={eventName}',
    content,
    flags=re.DOTALL
)

with open('src/Pages/Screen/Screen.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('Updated Screen.jsx to add eventName prop')
