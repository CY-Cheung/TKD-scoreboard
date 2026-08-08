# 跆拳道計分系統 (Taekwondo Scoreboard System) 🛠️

歡迎來到你的專屬跆拳道賽事 DIY 組裝包！
正如組裝一個書櫃，這個系統為觀眾、賽事管理員同邊線裁判提供咗「一啪即合」嘅無縫體驗。你唔需要準備六角匙，只需準備一個 Google 帳號同埋一部手機，我哋就可以開工！

## 📦 產品組件 (Key Features)

### 📺 實時計分大螢幕 (Live Scoreboard)
*   **實時同步 (Real-Time)**: 分數更新快過你跌咗粒螺絲。Firebase 實時數據庫加持，秒速同步。
*   **玻璃質感二維碼 (Glassmorphism QR Code)**: 經過精心調校嘅半透明 QR Code，完美融入磨砂玻璃背景。唔單止掃得到，仲好有質感！
*   **智能解析 (Smart Parse)**: 掟份官方 PDF 賽程表落去，系統就會好似睇說明書咁自動提取 Match IDs 同選手資料。

### 📱 手機遙控器 (Mobile Controller)
*   **免安裝 (No-App Installation)**: 掃描 QR Code 即刻用得，乾淨俐落。
*   **智能防搶位 (Smart Seat Locking)**: 採用咗高級嘅 Transaction 防呆設計，J1 裁判位再唔怕被「幽靈連線」霸佔。邊個坐緊？一目了然！斷線仲識自動讓座。
*   **有效得分機制 (Valid Point System)**: 2 位以上裁判喺 1 秒內篤同一個分先會加，杜絕手震同重複畀分。

### ⚙️ 賽事管理中心 (Admin Management)
*   **全局優雅彈窗 (Popup Framework)**: 我哋徹底丟棄咗嗰啲核突又阻掟嘅 Browser 原生 Alert，換上全套自家製暗黑玻璃風 Toast 同 Modal。操作從未如此順滑。
*   **精準拆除 (Precise Delete)**: 以前撳 Delete 會唔小心炸晒成個 Event？而家嘅 Delete 掣只會乖乖地刪除你選中嗰一場 Match，安全可靠。
*   **淘汰樹狀圖 (Tree Bracket)**: 自動排版，勝出者路徑閃閃發光。

---

## 🛠️ 組裝說明 (Tech Stack)
要砌好呢個系統，我哋用咗以下零件：
*   **層板 (Frontend)**: React 18 (Vite), React Router v6
*   **鉸鏈 (Backend)**: Firebase Realtime Database, Firebase Authentication
*   **漆油 (Styling)**: Vanilla CSS, 滿滿的 Glassmorphism 
*   **說明書翻譯機 (PDF Parsing)**: pdfjs-dist

## ⚠️ 安全警告 (Database Rules)
採用 Court-level Locking 機制。每部裝置都有自己嘅 ID，只有坐正喺位度嘅裝置先可以改分。斷線時 `onDisconnect()` 會自動清空席位。請勿讓兒童吞食。

---
*設計於香港，組裝於互聯網。This project is licensed under the MIT License.*
