# 用戶操作指南（User Manual）

**系統名稱：** 跆拳道雲端計分系統（Taekwondo Cloud Scoring System）  
**適用比賽：** Kyorugi（搏擊）  
**線上示範：** [https://cy-cheung.github.io/TKD-scoreboard/](https://cy-cheung.github.io/TKD-scoreboard/)  
**文件日期：** 2026-08-13

> **Codebase baseline:** flat RTDB 雲端同步；操作步驟以現行 Pages UI 為準。技術細節 → [`FIREBASE_MULTI_DEVICE_DESIGN.md`](./FIREBASE_MULTI_DEVICE_DESIGN.md)。  
> **用語：** Technical Card 中文一律「技術卡」（同畫面 `Edit` 嘅「技術卡」一致）。

> 本指南用香港粵語寫俾**現場操作人員**睇。  
> 標 **`[待確認]`** 嘅步驟：程式碼未能完全核實，或者視乎你哋賽會實際設定。

---

## 1. 你需要啲咩？

| 角色 | 建議裝置 | 要唔要 Google |
|------|----------|----------------|
| 賽事管理員／場地操作 | 筆電或平板（接大螢幕更好） | **要**（建立同管理賽事） |
| 主裁（用大螢幕底下 Edit） | 同大螢幕嗰部電腦 | 跟住場地 session 即可 |
| 邊裁（J1／J2／J3） | 手機瀏覽器 | **唔使**；掃 QR 就得 |

瀏覽器建議用較新嘅 Chrome／Edge；手機用系統瀏覽器開連結即可。

---

## 2. 五分鐘開賽流程（總覽）

1. 打開示範網址（或你哋部署嘅網址）。  
2. 用 **Google 登入**。  
3. 喺 **Court Setup（場地設定）** 建立或揀一個 Event，再揀 Court。  
4. 進入 **Home（主頁）** → **Manage Match（管理場次）** → **Load** 今場比賽。  
5. 開 **Scoreboard（大螢幕）**，按空白鍵開始計時。  
6. 按 `Q` 或主頁按鈕顯示 **QR**，邊裁掃碼入 **Controller**。  
7. 邊裁搶席後按得分掣；主裁用 Edit 處理 Gam-jeom、判勝、Technical Card（技術卡）、IVR 等。

---

## 3. 登入同進入場地

### 3.1 Landing（首頁介紹）

1. 打開網站根路徑。  
2. 睇到產品介紹同「Google 登入」按鈕。  
3. 登入成功後，系統會帶你去 **Court Setup**。

### 3.2 Court Setup（場地設定）

1. 你應已喺 Landing 完成 Google 登入（未登入會被帶回 Landing，唔會見到 Court Setup 登入牆）。  
2. **建立新賽事**：填賽事名稱、規則（例如回合時間、分差上限、Gam-jeom 上限等）、setup password（如有）。  
3. （可選）上傳 **HKTKDA** 格式對陣 **PDF**；若 PDF 含多日，系統可能拆成多個子賽事 → 細節以畫面提示為準。  
4. 喺列表揀已有 Event。  
5. 揀 **Court（場地）**。  
6. 若你唔係建立者，可能要輸入 **setup password**。  
7. 成功後會進入 **Home**，並記住今次揀嘅 Event／Court。

**換場地：** 返 Court Setup。系統會清走今次 Event／Court 工作階段，但通常**唔會**強制你重新 Google 登入。

**登出 Google：** 喺 Home 等位置使用 Google Logout（以畫面按鈕為準）。

---

## 4. Home（主頁）可以做咩？

進入後你會見到目前賽事／場地資訊，同大致呢啲入口：

| 功能 | 用途 |
|------|------|
| **Scoreboard／大螢幕** | 去計分主畫面 |
| **Manage Match／管理場次** | 編輯場次、Load 比賽、Bracket |
| **Corner Judge／邊裁 QR** | 顯示俾邊裁掃嘅碼（亦可按鍵盤 `Q`） |
| **返 Court Setup** | 換 Event／Court |
| **Google Logout** | 登出帳號 |

---

## 5. 管理場次（Manage Match）

路徑概念：Home → Manage Match（`/import`）。

常見操作：

1. **新增／編輯 Match**：填紅藍方選手、所屬會、規則、IVR 配額等。  
2. **Load Match**：將該場設為呢個 Court「而家打緊」嘅比賽；大螢幕同邊裁會跟住呢場。  
   - **注意：** 同一場 Match **唔可以**同時 Load 去兩個 Court（會共用分數／計時）。若已喺其他場地，系統會拒絕並提示。  
   - **Unload（卸載）：** 清走呢個 Court 嘅 `currentMatchId`（唔刪比賽資料）。換場或要釋放 Match 俾其他 Court Load 時用。  
3. **日期篩選**（如有）：縮短列表。  
4. **Tournament Bracket（淘汰樹）**：睇晉級路徑；完場後可喺主裁面板 **Promote Winner（晉級勝者）**。  

> **建立賽事／匯入 PDF** 只喺 **Court Setup**，唔喺 Manage Match 頁。

---

## 6. 大螢幕（Scoreboard／Screen）

### 6.1 基本顯示

- 紅／藍分數、Gam-jeom、局數、計時、優勢方等會即時更新。  
- 日誌區可能顯示近期得分同投票過程（視模式而定）。

### 6.2 常用鍵盤

| 鍵 | 作用 |
|----|------|
| `Space`（空白鍵） | 開始／暫停計時 |
| `E` | 打開／關閉主裁 Edit 底欄 |
| `Q` | 顯示／關閉邊裁 QR |
| `K` | 開始／處理 Kye-shi（傷停類倒數；預設約 60 秒） |
| `\`（反斜線） | 切換紅藍顯示方向 |

> 若鍵盤焦點喺輸入框，快捷鍵可能唔生效 — 先撳一下畫面空白處。

### 6.3 回合同完場（你會見到嘅現象）

- 達 **PTG**（分差夠大）或 **PUN**（Gam-jeom 達上限）時，計時通常會停，畫面標示原因。  
- 主裁宣判該局勝者後，可能進入 **REST（休息）** 倒數；休息完可入下一回合。  
- 局數勝出達標後，比賽 **PTF** 完場。  
- **休息期間唔應該再改分**（系統會擋）。

---

## 7. 主裁面板（Edit）

喺大螢幕按 `E`，或點同 Gam-jeom 相關入口打開底欄（以畫面為準）。

你可以：

- **手動加減** Punch／Body／Head／Turning 等分數。  
- 加減 **Gam-jeom**；若比賽剩大約最後 10 秒，加罰時可能彈窗問係唔係 **Avoiding Penalty（回避犯規）**。  
- **宣判局勝**（紅／藍）。  
- **Promote Winner**：將勝者寫入下一場（該場要已設晉級路徑）。  
- **Kye-shi**。  
- **Technical Card（技術卡）** — 見下節。  
- **IVR（Instant Video Replay／錄影重播挑戰）** — 見下節。  
- 微調時間、IVR 剩餘次數等（以畫面上有嘅欄位為準）。

---

## 8. Technical Card（技術卡）

1. 喺 Edit 揀藍或紅嘅 Technical Card（技術卡）。  
2. **Step 1 確認**：  
   - **Accept**：接受請求  
   - **Reject**：拒絕，之後會加 1 個 Gam-jeom  
   - **Cancel**：取消  
3. **Step 2 公告**：大螢幕中央約 **3 秒** glass card；同一場地其他大螢幕亦應一齊顯示。  
4. Accept：公告完**分數唔變**。  
5. Reject：公告完先至 +1 Gam-jeom（唔係一按就即時加）。

進行中唔好重複狂按；系統有保護避免重複開。

---

## 9. IVR（Instant Video Replay）

1. 喺 Edit 開 IVR 流程（藍／紅）。  
2. 確認 **Accept** 或 **Reject**。  
3. 大螢幕顯示約 3 秒公告。  
4. 系統會更新該方 **IVR 剩餘次數**：  
   - **留空／無限**：Accept 後仍然無限；Reject 後變 **0**。  
   - **已設定數字 N**：Accept 減 1；Reject 直接歸零。  
   - 配額係 **成場比賽共用**，換回合一般**唔會**重置。

具體顯示文案請以現場畫面同賽會規則為準；若同最新 WT 條文有出入 → `[待確認]`。

---

## 10. 邊裁手機（Controller）

### 10.1 入場

1. 大螢幕或 Home 顯示 QR。  
2. 手機掃描，打開連結（帶有 event、court 參數）。  
3. 系統會自動嘗試搶 **J1 → J2 → J3** 空位。  
4. 成功後會見到你嘅席位；失敗／滿席會提示類似 **Court is Full**。

### 10.2 得分掣

畫面無 top bar／選手名條；中間有 Mode／Judge 黃盒同回合資訊。掣大致對應：

| 掣 | 分數 |
|----|------|
| Punch | +1 |
| Body | +2 |
| Head | +3 |
| Turning Body | +4 |
| Turning Head | +6 |

注意：

- **計時暫停（Paused）時通常唔可以畀分。**  
- **Gam-jeom 唔喺邊裁遙控度按**；交俾主裁 Edit。  
- **Single mode**：一按就加。  
- **Multiple mode**：要大約 **1 秒內**有 **兩個唔同裝置** 撳同一類型得分，先算有效分。  
- 請用 **橫向（landscape）** 握機；畫面會跟瀏覽器可視區域比例縮放。

斷線或關閉分頁後，席位應會自動釋放，其他手機可再搶。

### 10.3 管理員用電腦開 Controller

若你已 Google 登入再開 Controller，系統可能以 **Admin** 方式計分、**唔佔** J1–J3 席 — 方便測試，但正式三邊裁請用未登入手機掃 QR。

---

## 11. 裁判模式（Single／Multiple）

喺 QR／場地設定相關介面可以揀（實際掣位置以畫面為準）：

| 模式 | 意思 |
|------|------|
| **Single** | 一位有效操作即可加分（適合練習或人手較少） |
| **Multiple** | 需要兩位邊裁短時間內同意先加分（較接近多裁判確認） |

---

## 12. 常見問題（FAQ）

**Q：掃完 QR 入唔到？**  
A：檢查連結係咪完整、場地有冇 Load 咗 Match、網路可唔可以連到 Firebase。試下重新顯示 QR。

**Q：我按咗分但大螢幕冇反應？**  
A：睇下係咪 Paused、係咪 REST、Multiple mode 係咪得你一個人按、席位係咪搶成功。計分資料係即時同步，通常幾秒內大螢幕會更新。

**Q：點解加咗罰分，對手分數反而高咗？**  
A：Gam-jeom／Avoiding 記喺**被罰一方**，但計算總分時會加俾**對手** — 呢個係計分規則。

**Q：資料安唔安全？**  
A：賽事資料目前設計上可被讀取（公開讀規則）。唔好當系統可以藏機密名單。現場操作只需記：唔好放敏感私隱。

**Q：可唔可以品勢（Poomsae）計分？**  
A：而家呢套系統定位係 **Kyorugi（搏擊）**；品勢功能未見。

---

## 13. 現場操作小貼士

1. 賽前用一部後備手機試掃 QR、試 Single／Multiple。  
2. 大螢幕電腦避免睡眠；接穩電源。  
3. 邊裁手機盡量唔好自動鎖屏（視系統設定）。  
4. 正式賽建議測試關分頁後席位會唔會釋放。  
5. 多 Court 並行時，每個場地各自 Load **唔同**場次；**唔好**兩個 Court Load 同一個 Match（系統會擋）。

---

## 14. 需要更多技術細節？

| 文件 | 內容 |
|------|------|
| `docs/1_PRD.md` | 產品目標同用戶故事 |
| `docs/2_System_Design.md` | 架構同資料庫 |
| `docs/3_API_Documentation.md` | 路由同程式介面 |
| `docs/4_Test_Plan.md` | 測試計劃 |
| `docs/FIREBASE_MULTI_DEVICE_DESIGN.md` | 多裝置同步細節 |

---

## 15. 文件紀錄

| 日期 | 變更 |
|------|------|
| 2026-08-10 | 初版：由介面同程式反向整理嘅粵語操作指南 |
| 2026-08-11 | 用語統一：Technical Card 中文一律「技術卡」 |
| 2026-08-13 | Manage Match 唔再建立賽事；IVR 無限／Reject→0；Controller landscape UI |
