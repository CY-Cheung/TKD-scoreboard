import re

with open('src/Pages/CourtSetup/CourtSetup.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Make the login text bigger and add more spacing
old_block = """            <div className="cs-form" style={{ textAlign: 'center' }}>
              <p style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '1.3cqi', marginBottom: '1.5cqi', lineHeight: '1.6' }}>
                毋須額外註冊，<br />只需登入 Google 帳號即可。
              </p>
              {authError && <p className="cs-error-message">{authError}</p>}
              <div className="google-btn-wrapper">
                <Button
                  onClick={handleGoogleSignIn}
                  text="Google (登入)"
                  icon={<Key size="1.25cqi" />}
                  fontSize="1cqi"
                  variant="gemini"
                />
              </div>
              <p style={{ fontSize: '0.85cqi', color: 'rgba(255, 255, 255, 0.4)', marginTop: '1cqi' }}>
                系統將會驗證您的身分並載入賽事場地數據
              </p>
            </div>"""

new_block = """            <div className="cs-form" style={{ textAlign: 'center', padding: '2cqi' }}>
              <p style={{ color: 'rgba(255, 255, 255, 0.95)', fontSize: '1.8cqi', marginBottom: '2.5cqi', lineHeight: '1.6', fontWeight: '500' }}>
                毋須額外註冊，<br />只需登入 Google 帳號即可。
              </p>
              {authError && <p className="cs-error-message">{authError}</p>}
              <div className="google-btn-wrapper" style={{ display: 'flex', justifyContent: 'center' }}>
                <Button
                  onClick={handleGoogleSignIn}
                  text="Google (登入)"
                  icon={<Key size="1.6cqi" />}
                  fontSize="1.3cqi"
                  variant="gemini"
                  style={{ padding: '1cqi 2cqi' }}
                />
              </div>
              <p style={{ fontSize: '1.05cqi', color: 'rgba(255, 255, 255, 0.5)', marginTop: '2cqi' }}>
                系統將會驗證您的身分並載入賽事場地數據
              </p>
            </div>"""

if old_block in content:
    content = content.replace(old_block, new_block)
    with open('src/Pages/CourtSetup/CourtSetup.jsx', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Updated login UI block successfully!")
else:
    print("Could not find the exact old_block. Maybe it was formatted differently?")
