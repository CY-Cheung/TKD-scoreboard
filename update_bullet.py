import re

with open('src/Pages/CourtSetup/CourtSetup.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

old_list = re.search(r'<ul className="cs-app-intro-list">.*?</ul>', content, re.DOTALL).group(0)

new_list = '''<ul className="cs-app-intro-list">
                            <li><strong>無須安裝 App</strong>：手機掃描 QR Code 即刻化身遙控器，隨時隨地開始計分。</li>
                            <li><strong>防重複加分機制</strong>：多裁判模式下需於 1 秒內一致畀分先算有效，確保計分公平。</li>
                            <li><strong>智能動態對戰表</strong>：一鍵匯入官方 PDF 賽程，自動生成實時更新嘅淘汰賽晉級圖。</li>
                            <li><strong>自動連線監控</strong>：智能鎖定裁判席位，斷線即時警示並自動調整模式，比賽絕不中斷。</li>
                        </ul>'''

content = content.replace(old_list, new_list)

with open('src/Pages/CourtSetup/CourtSetup.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('Updated CourtSetup.jsx bullet points.')
