# Taekwondo Scoreboard System (跆拳道計分系統)

一個用 React (前端框架) 同 Firebase (雲端資料庫) 寫成嘅現代化、Real-time (實時) 跆拳道比賽計分系統。專為觀眾、賽事管理員同 Corner Judges (邊線裁判) 提供 Seamless (無縫) 嘅體驗。

## 🌟 Key Features (主要功能)

### 📺 Live Scoreboard (實時計分板 - Screen)
* **Real-time Sync (實時同步)**: 透過 Firebase Realtime Database (實時資料庫) 做到分數秒速更新。
* **Smart Match Resolution (智能賽事解析)**: 利用 Reverse Tracing (反向追蹤) 同 Midpoint Matching (中點配對) Algorithm (演算法) 解析官方 PDF (可攜式文件格式) 賽程表，自動提取 Match IDs (比賽編號)、選手名、屬會同重量級別。
* **Dynamic QR Code (動態二維碼)**: 大屏幕會顯示專屬 QR Code (二維碼)，最多允許 3 位裁判用手機直接連接並控制目前嘅 Court (場地)。
* **Auto-Downgrade & Connection Alert (自動降級與斷線提示)**: 系統實時監測裁判連線狀態，當裁判意外斷線會即時彈出警示 (Toast Notification)；若多位裁判模式下連線人數不足 2 人，系統更會自動降級回單一裁判模式以保證賽事順利進行。

### 📱 Mobile Controller (手機遙控器 - Remote)
* **No-App Installation (免安裝應用程式)**: 裁判只需掃描 QR Code (二維碼) 即可喺 Mobile Browser (手機瀏覽器) 操作，無須下載任何 App。
* **Smart Seat Locking (智能座位鎖定)**: 採用 Distributed Locking (分散式鎖定) 機制，自動將裁判分配去 `J1`, `J2`, 或 `J3` 席位。每個 Court (場地) 嚴格限制最多 3 人連接，斷線會自動讓座。
* **Valid Point System (有效得分投票機制)**: 支援「Multiple Referee (多位裁判)」模式，當 2 位或以上裁判喺 1000 毫秒 (1秒) 內投出相同分數時，系統先會判定為有效並透過 `runTransaction` 原子操作正式加分，完美杜絕重複加分 (Double Scoring)。
* **Haptic Feedback (觸覺回饋)**: 激烈撳分時，手機會提供即時震動回饋，提升操作手感。
* **Secure Access (安全存取)**: Firebase Security Rules (保安規則) 會嚴格驗證發送指令嘅 Device ID (裝置識別碼)。就算裁判無登入 Google Account (Google 帳戶)，亦能有效防止未經授權嘅亂改分行為。

### ⚙️ Event Management (賽事管理 - Admin)
* **PDF Data Import (PDF 資料匯入)**: 強大嘅樹狀結構解析器，完美還原官方跆拳道淘汰賽賽程。
* **Interactive Tournament Bracket (互動式對戰表)**: 支援動態生成二元樹狀對戰表 (Binary Tree Bracket)。
  * **Smart Layout (智能排版)**: 採用 CSS Grid 技術，完美處理非對稱 (Unbalanced) 嘅賽程（例如首輪輪空 BYE），確保晉級線精準對齊。
  * **Dynamic Glow Effect (動態發光特效)**: 與資料庫實時連動，當比賽分出勝負後，勝方嘅晉級路徑會即時亮起螢光黃色，實時反映賽事進度。
  * **Zoom Controls (縮放控制)**: 內建放大/縮小功能，方便管理員總覽及尋找超大型賽事嘅對戰組合。
* **Court Setup (場地設定)**: 管理員透過 Google Authentication (Google 身份驗證) 安全登入，初始化場地及切換比賽。
* **Admin Override (管理員覆寫)**: 擁有權限嘅管理員可以無視座位限制，自由修改分數及比賽狀態。

## 🚀 Tech Stack (技術棧)

* **Frontend Framework (前端框架)**: React 18 (Vite)
* **Routing (路由)**: React Router v6
* **Database & Auth (資料庫與身份驗證)**: Firebase Realtime Database (實時資料庫), Firebase Authentication (身份驗證)
* **Styling (樣式)**: Vanilla CSS (原生級聯樣式表) 配合動態網格動畫 (Glassmorphism & CSS Grid)
* **PDF Parsing (PDF 解析)**: pdfjs-dist

## 🛠️ Setup & Installation (安裝與設定)

1. **Clone the repository (複製儲存庫):**
   ```bash
   git clone <your-repo-url>
   cd TKD-scoreboard
   ```

2. **Install dependencies (安裝依賴套件):**
   ```bash
   npm install
   ```

3. **Firebase Configuration (Firebase 設定):**
   * 建立一個 Firebase Project (專案)，並啟用 **Realtime Database (實時資料庫)** 同 **Google Authentication (Google 身份驗證)**。
   * 將你嘅專案憑證取代 `src/firebase.js` 內嘅設定。
   * 部署保安規則：
     ```bash
     npx firebase-tools deploy --only database
     ```

4. **Run the development server (啟動開發伺服器):**
   ```bash
   npm run dev
   ```

## 📐 Database Rules Architecture (資料庫規則架構)

本系統採用先進嘅 Court-level Locking (場地層級鎖定) 機制。當裁判掃描 QR Code 時，其裝置會產生一個獨立嘅 Device ID (裝置識別碼) 並嘗試搶佔該場地空置嘅席位 (`J1`, `J2`, 或 `J3`)。Firebase Security Rules (保安規則) 嚴格規定，只有目前佔據該席位嘅裝置，先可以修改該場地進行中比賽嘅分數。若裁判斷線，`onDisconnect()` 觸發器會自動清空其席位，供下一位候補。

## 📄 License (授權條款)

This project is licensed under the MIT License.
