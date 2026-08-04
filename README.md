# WT 跆拳道即時計分系統

## 測試與起動指南 (Quick Start)

呢份文件記錄咗點樣喺 Local (本地) 起動同埋測試呢個計分系統，如果你唔記得咗點開，隨時睇返呢度就得！

### 第一步：起動 Server (後端)
1. 喺 VS Code 按 `Ctrl + ~` (或者去頂部 Menu 揀 `Terminal -> New Terminal`) 打開終端機。
2. 輸入以下指令啟動 Server：
   ```powershell
   cd server
   node server.js
   ```
   *(如果你見到 `Server listening on port 3001` 就代表成功啦)*

### 第二步：起動 Client (前端)
1. 喺終端機面版嘅右上角，㩒個 `+` 號開多個新 Tab (分頁)。
2. 輸入以下指令啟動 Frontend：
   ```powershell
   cd client
   npm run dev -- --host
   ```
   *(如果成功，佢會彈一條 Link 出嚟，通常係 `http://localhost:5173`)*

### 第三步：打開 Browser (瀏覽器) 試玩
打開 Chrome，開幾個唔同嘅 Window (視窗)，貼上以下網址去模擬唔同角色：

| 角色 | 測試網址 | 操作方法 |
| :--- | :--- | :--- |
| **大螢幕** | `http://localhost:5173/` | 純顯示，禁 `\` 鍵可以左右反轉 |
| **主控台** | `http://localhost:5173/?role=admin` | 禁 `Enter` 鍵會喺下面彈個 Admin 面板出嚟，可以控制加減分同埋 Start/Pause |
| **裁判手掣** | `http://localhost:5173/?role=referee` | 禁上面嘅掣測試打分 (建議撳 F12 開 Developer Tools 扮手機版睇，每撳一吓都會震) |

💡 **測試小貼士**：最好將「大螢幕」同「主控台」並排一齊睇，當你喺 Admin 面板或者手掣度㩒掣，大螢幕嘅分數同埋 Timer 會做到零延遲即刻同步更新！

---

## 軟件需求規格說明書 (Software Requirements Specification) v3

### 1. 系統整體架構與角色 (Architecture & Roles)

系統採用「即棄式 (Disposable)」MVP 設計，無須 Database (數據庫)，所有資料暫存於 Server (伺服器) 嘅 Memory (記憶體) 中。重置比賽即清空資料。

系統底層嚴格區分 3 個角色，以確保 Security (安全性) 及支援多螢幕擴展
| 角色 | 連線識別 (URL 參數) | 職責與權限 |
| :--- | :--- | :--- |
| **Server (伺服器)** | (中央大腦) | 唯一嘅「真理來源」。負責運算 Logic (邏輯)、管理連線、維持 State Machine (狀態機) 及向全場進行 Broadcast (廣播)。 |
| **主控台 (Admin)** | `?role=admin` | 最高權限。UI (用戶介面) 與大螢幕結合，包含隱藏之控制面板。負責開局、設定裁判人數、暫停、手動加減分、確認回合結果及執行 IVR (即時錄像重審)。 |
| **大螢幕 (Display)** | `?role=display` | 狀態接收器。UI (用戶介面) 為純淨版大螢幕，無任何隱藏控制按鈕。被動顯示 Server (伺服器) 傳送嘅最新分數與時間。 |
| **裁判手掣 (Referee)** | `?role=referee` | 動作觸發器。只負責將按鍵訊號發送畀 Server (伺服器)。採用 **Fixed Slots (固定席位制)** 處理斷線重連。 |

### 2. 核心數據模型 (Core Data Model)

為防止數據衝突及支援完美復原，系統採用 **Single Source of Truth (單一真理來源)** 及 **Derived State (衍生狀態)** 設計：

* **比賽設定檔 (Configuration)：** 包含裁判人數 (可選 1 至 3 人)、PTG 分差門檻 (預設 15)、PUN 犯規門檻 (預設 5)、回合時間等。
* **動作計數表 (Action Counts)：** 系統只記錄動作「發生次數」，不直接修改分數。
    * 紅/藍雙方各自擁有獨立紀錄：`punch` (正拳)、`body` (踢軀幹)、`head` (踢頭)、`turningBody` (轉身軀幹)、`turningHead` (轉身踢頭)、`gamJeom` (犯規)。
* **分數映射表 (Point Map - 2026新例)：** 獨立設定各動作價值。根據最新賽例轉身分數乘2：正拳=1, 踢軀幹=2, 踢頭=3, 轉身踢軀幹=4, 轉身踢頭=6, 對方 Gam-jeom=1。
* **計分公式：** 總分 = Σ (各項動作次數 × 對應分數)

### 3. 核心業務邏輯 (Core Business Logic)

#### A. 動態聯判機制 (Dynamic Co-judging Mechanism)
系統支援 1 至 3 名裁判模式，由主控台於開局前設定，運作邏輯如下：

* **單人裁判模式 (1 Referee)：**
    * 裁判按下攻擊按鈕後，**即時生效**。
    * 直接寫入歷史紀錄並重新計算分數，向全場進行 Broadcast (廣播)，無須等候。
* **多人裁判模式 (2-3 Referees)：**
    * 採用 Asynchronous Processing (非同步處理)，紅藍雙方擁有獨立嘅 Time Window (時間窗) 計時器。
    * **收到第一票：** 啟動 1000ms 倒數。
    * **防連撳作弊：** 同一個 Time Window 內，收到同一位裁判第二票將被忽略。
    * **判定得分：** 1000ms 內收到兩票或以上，判定得分並廣播，即時重置該方計時器。
    * **判定無效：** 1000ms 結束仍未達兩票，清空該次紀錄。

#### B. Gam-jeom (犯規) 執行流程
1. **暫停觸發：** Centre Referee (場上主審) 嗌出暫定口令。
2. **封鎖與停錶：** 主控台人員即時按下【暫停】。Server (伺服器) 暫停時間，並 **Block (封鎖)** 所有裁判手掣輸入。
3. **輸入犯規：** 主控台按下對應嘅【Gam-jeom】。
4. **計算與廣播：** 犯規方 `gamJeom` 數量 +1，重新計算雙方總分並廣播。大螢幕之 Event Log (事件日誌) 永久保留該紀錄。
5. **恢復比賽：** 等待主控台手動按下【繼續】以恢復比賽及解鎖手掣。

#### C. 自動監察與提早結束 (Early Termination)
每次分數變動，Server (伺服器) 會根據設定檔檢查以下 Variable (變數)，一旦觸發，立即暫停並觸發回合結束：
* **PTG (分差勝)：** 雙方小分差距 >= 設定值（預設 15 分）。
* **PUN (犯規落敗)：** 單方累積 Gam-jeom 達設定值（預設 5 次）。

#### D. 平手自動裁決演算法 (Tie-breaker Algorithm)
回合結束且分數平手時，系統後台瞬間執行 6 層 Algorithm (演算法) 判斷：
1. 比較轉身動作總得分 (`turningBody` + `turningHead`)。
2. 比較踢頭總次數 (`head` + `turningHead`)。
3. 比較踢軀幹總次數 (`body` + `turningBody`)。
4. 比較正拳次數 (`punch`)。
5. 比較 Gam-jeom 數量（少者勝）。
6. **Level 6 (Woo-see girok)：** 若 5 項全同，進入 `SUPERIORITY_WAITING` 狀態。系統鎖定，由主控台根據場上裁判手勢，手動輸入勝方。

### 4. 狀態機與比賽流程 (State Machine Flow)

| 狀態 (State) | 觸發條件 | 系統運作邏輯 |
| :--- | :--- | :--- |
| **`ROUND_READY`** (回合就緒) | 開局 或 休息結束 | 顯示回合時間 (如 2:00)。小分及 Gam-jeom 清零。手掣鎖定。等待主控台按開始。 |
| **`ROUND_IN_PROGRESS`** (回合進行中) | 主控台按「開始」 | 倒數計時。手掣解鎖，接收得分訊號。持續執行自動監察。 |
| **`ROUND_END_TRIGGERED`** (觸發回合結束) | 0:00、達 PTG 或 PUN | 自動停止計時，鎖定手掣。進入結果確認階段。 |
| **`RESULT_CONFIRMATION`** (結果確認/IVR緩衝) | 緊接上一步自動進入 | 顯示「暫定結果」。主控台可執行 IVR 修改數據。等待最終人手確認。 |
| **`REST_IN_PROGRESS`** (局間休息) | 主控台按「確認結果」 | 派發「大分」(勝局)。啟動休息倒數 (如 1:00)。倒數完畢自動切回 `ROUND_READY`。 |

### 5. 前端介面設計規範 (Frontend UI Specs)

#### A. 大螢幕與主控台二合一架構 (Combined Display & Admin UI)
為咗方便單機操作並保留擴充性，主控台與大螢幕將共用底層 `Screen.jsx` 組件，並透過 Conditional Rendering (條件渲染) 區分功能：
* **`?role=display` 模式：** 只渲染純淨嘅分數牌與 Event Log (事件日誌)，屏蔽所有點擊事件。接收到按鍵事件時亮起對應燈號，多人聯判模式下 1000ms 結算後不熄滅並保持在 Score Record (得分紀錄)。
* **`?role=admin` 模式：** 底層渲染分數牌，但可透過特定按鈕或 Keyboard Shortcuts (鍵盤快捷鍵) 呼叫出 Overlay Modal (覆蓋式模態視窗)，顯示 `Edit.jsx` 控制面板以進行各項賽事操作 (包含開局設定裁判人數)。

#### B. 裁判手掣 (Referee UI)
* **盲打優化 (Blind-typing Optimized)：** 橫向佈局。5 個巨大按鈕 (正拳、軀幹、頭、轉身軀幹、轉身頭)。
* **無視覺干擾：** 按下不顯示得分提示，僅提供 **Haptic Feedback (觸覺震動回饋)**。
