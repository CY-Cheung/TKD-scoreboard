# Taekwondo Scoreboard System (跆拳道計分系統)

一個用 React 同 Firebase 寫成嘅現代化 Real-time (實時) 跆拳道比賽計分系統，為觀眾、賽事管理員同 Corner Judges (邊線裁判) 提供 Seamless (無縫) 體驗。

## 🌟 Key Features (主要功能)

### 📺 Live Scoreboard (實時計分板 - Screen)
* **Real-time Sync (實時同步)**: 透過 Firebase Realtime Database 做到分數秒速更新。
* **Smart Match Resolution (智能賽事解析)**: 解析官方 PDF 賽程表，自動提取 Match IDs (比賽編號) 及選手資料。
* **Dynamic QR Code (動態二維碼)**: 顯示專屬 QR Code，畀最多 3 位裁判用手機連接 Court (場地)。
* **Auto-Downgrade & Connection Alert (自動降級與斷線提示)**: 實時監測連線，斷線即時警示；人數不足會自動降級為單一裁判模式。

### 📱 Mobile Controller (手機遙控器 - Remote)
* **No-App Installation (免安裝)**: 掃描 QR Code 即可喺 Mobile Browser (手機瀏覽器) 操作，無須下載 App。
* **Smart Seat Locking (智能座位鎖定)**: 採用 Distributed Locking 機制，自動分配 `J1`, `J2`, `J3` 席位，斷線自動讓座。
* **Valid Point System (有效得分機制)**: 支援 Multiple Referee 模式，2 位以上裁判喺 1秒內投出相同分數，先會透過 `runTransaction` 正式加分，杜絕 Double Scoring (重複加分)。
* **Haptic Feedback (觸覺回饋)**: 撳分時手機提供即時震動回饋。
* **Secure Access (安全存取)**: Firebase Security Rules 嚴格驗證 Device ID，防止未經授權改分。

### ⚙️ Event Management (賽事管理 - Admin)
* **PDF Data Import (資料匯入)**: 完美還原官方跆拳道淘汰賽賽程。
* **Interactive Tournament Bracket (互動式對戰表)**: 動態生成 Binary Tree Bracket，自動處理首輪輪空 (BYE) 排版；勝出者路徑即時亮起，並內建縮放功能。
* **Court Setup (場地設定)**: 透過 Google Authentication 安全登入，管理場地及比賽。
* **Admin Override (管理員覆寫)**: 管理員可自由修改分數及狀態。

## 🚀 Tech Stack (技術棧)
* **Frontend**: React 18 (Vite), React Router v6
* **Backend & Auth**: Firebase Realtime Database, Firebase Authentication
* **Styling**: Vanilla CSS, Glassmorphism, CSS Grid
* **PDF Parsing**: pdfjs-dist

## 🛠️ Setup & Installation (安裝與設定)

```bash
git clone <your-repo-url>
cd TKD-scoreboard
npm install
```

**Firebase Configuration (Firebase 設定):**
1. 建立 Firebase Project，啟用 **Realtime Database** 同 **Google Authentication**。
2. 將憑證寫入 `src/firebase.js`。
3. 部署保安規則：`npx firebase-tools deploy --only database`

**Run Development Server:**
```bash
npm run dev
```

## 📐 Database Rules Architecture (規則架構)
採用 Court-level Locking (場地層級鎖定) 機制。掃描 QR Code 時產生獨立 Device ID 搶佔空置席位。Firebase 嚴格規定只有佔據該席位嘅裝置可修改分數。斷線時 `onDisconnect()` 自動清空席位。

## 📄 License
This project is licensed under the MIT License.
