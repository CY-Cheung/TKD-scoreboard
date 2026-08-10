# TKD-scoreboard AI Agent 指示

## 目的
呢個文件用嚟幫助 coding agents 快速理解 TKD-scoreboard repository 嘅結構、慣例同最重要檔案。

## 主要專案事實
- 前端 React 應用，使用 Vite 打包。
- 用 Firebase Realtime Database 做實時比分更新同裁判席位管理。
- 用 `pdfjs-dist` 做 PDF 解析，處理賽程資料導入。
- 無後端 server code 喺呢個 repository 入面。
- 部署目標係 GitHub Pages；`vite.config.js` 用咗 `base: '/TKD-scoreboard/'`。

## 主要命令
- `npm install` 安裝依賴。
- `npm run dev` 啟動本地 Vite 開發伺服器。
- `npm run build` 建立 production bundle 到 `dist/`。
- `npm run lint` 喺 repository 上運行 ESLint。
- `npm run deploy` 用 `gh-pages` 發佈 `dist/` 網站。

## 最重要嘅源碼檔案
- `src/App.jsx` — 應用路由同主要 layout。
- `src/main.jsx` — React app 啟動入口。
- `src/firebase.js` — Firebase 初始化。
- `src/Api.js` — 主要賽分邏輯、比賽載入同 Firebase 互動。

## 頁面 / 功能入口
- `src/Pages/Controller/Controller.jsx` — 邊線裁判控制器 UI 同裁判席位邏輯。
- `src/Pages/Screen/Screen.jsx` — 計分大螢幕顯示。
- `src/Pages/CourtSetup/CourtSetup.jsx` — 場地設定。
- `src/Pages/DataImport/DataImport.jsx` — PDF 匯入同賽事設定。
- `src/Pages/Screen/Edit.jsx` — 編輯大螢幕顯示同賽事設定。

## 元件同 UI 慣例
- App 元件存放喺 `src/Components/`。
- 樣式係純 CSS，通常同每個元件 / 頁面一齊放，例如 `ComponentName.css`。
- Popup 同 modal 行為由 `src/Context/PopupContext.jsx` 管理。
- Authentication / 裁判狀態用 `src/Context/AuthContext.jsx`。

## Firebase 實時設計
- repository 有一份設計文件：`docs/FIREBASE_MULTI_DEVICE_DESIGN.md`。
- 用嗰份文件做 slot-based 裁判登入、`onDisconnect()` 清理、event/court 資料流嘅主要參考。
- `database.rules.json` 同 `firebase.json` 定義咗部署用嘅 database rules 同 hosting 設定。

## 變更慣例
- 搭理 routing 或資源路徑時要記住 Vite `base` path。
- 避免編輯 `dist/` 裡面嘅已生成輸出。
- 做 UI 改動時，盡量遵從現有嘅 CSS module-like 方式：每個元件 / 頁面一個 CSS 檔案。
- 做 Firebase 改動時，要保持現有裁判席位同 event 資料結構。

## 有用嘅文檔連結
- `README.md` — 面向用戶嘅產品同功能概述。
- `docs/FIREBASE_MULTI_DEVICE_DESIGN.md` — 實時資料模型同多裝置協調設計。
- `package.json` — 腳本同依賴清單。

## Agent 備註
- 想新增前端功能時，優先改 `src/Pages` 同 `src/Components`，唔好直接改 tooling。
- 想修 data synchronization bug，先睇 `src/Api.js`、`src/firebase.js`、`src/Pages/Controller/Controller.jsx` 同 `src/Pages/Screen/Screen.jsx`。
- 如果任務涉及 QR code、match import 或 event setup，`src/Components/QRCodeDisplay/QRCodeDisplay.jsx` 同 `src/Pages/DataImport/DataImport.jsx` 特別相關。
