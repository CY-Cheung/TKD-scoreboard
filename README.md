# Taekwondo Scoreboard System (跆拳道計分系統) 🥋

一個採用 React 與 Firebase 開發的現代化、實時 (Real-time) 跆拳道比賽計分系統。專為觀眾、賽事管理員及邊線裁判 (Corner Judges) 打造無縫、順暢的賽事體驗。只需一個 Google 帳號與手機，即可隨時隨地開賽！

## 📦 核心功能 (Key Features)

### 📺 實時計分大螢幕 (Live Scoreboard)
*   **實時同步 (Real-time Sync)**: 藉由 Firebase 實時數據庫，確保比賽分數與狀態即時更新，毫秒不差。
*   **高質感動態二維碼 (Glassmorphism QR Code)**: 精心調教的半透明玻璃感 QR Code，完美融入 UI 背景，掃描迅速且極具科技感。
*   **智能賽程解析 (Smart PDF Parse)**: 支援一鍵匯入官方 PDF 賽程表，系統會自動提取比賽編號 (Match IDs)、選手資料與比賽日程，免去繁瑣的人工輸入。

### 📱 手機遙控器 (Mobile Controller)
*   **免安裝 (No-App Installation)**: 裁判只需掃描大螢幕上的 QR Code，即可在手機瀏覽器直接開始計分。
*   **智能防搶位 (Smart Seat Locking)**: 採用嚴謹的 Transaction 防呆機制。J1、J2、J3 裁判位自動分配，有效防止「幽靈連線」霸佔席位，斷線自動釋放座位。
*   **有效得分機制 (Valid Point System)**: 支援多裁判模式。當 2 位以上的裁判在 1 秒內給予相同分數時，系統才會正式加分，徹底杜絕手抖誤觸與重複給分。

### ⚙️ 賽事管理中心 (Admin Management)
*   **全局優雅彈窗 (Global Popup Framework)**: 棄用瀏覽器原生的醜陋 Alert，全面採用自家設計的暗黑玻璃風格 Toast 與 Modal 彈窗，操作流暢且介面統一。
*   **精準刪除 (Precise Delete)**: 刪除功能只會針對目前選取的單一場次 (Match) 進行刪除，並附帶確認彈窗，確保不會誤刪整個賽事的所有資料。
*   **動態淘汰樹狀圖 (Interactive Tournament Bracket)**: 支援動態生成對戰表，自動處理首輪輪空 (BYE) 排版，勝出者路徑會即時亮起。

---

## 🛠️ 技術架構 (Tech Stack)
*   **前端 (Frontend)**: React 18 (Vite), React Router v6
*   **後端與認證 (Backend & Auth)**: Firebase Realtime Database, Firebase Authentication
*   **樣式 (Styling)**: Vanilla CSS, Glassmorphism 介面設計
*   **PDF 解析 (PDF Parsing)**: pdfjs-dist

## ⚠️ 資料庫安全 (Database Rules)
系統採用 Court-level Locking 機制。每部裝置皆擁有獨立 ID，Firebase 嚴格驗證確保只有確實佔據該席位的裝置才能修改分數。斷線時觸發 `onDisconnect()` 自動清空連線紀錄。

---
*設計於香港。This project is licensed under the MIT License.*
