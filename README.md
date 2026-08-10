# 跆拳道計分系統 (Taekwondo Scoreboard System) 🛠️

歡迎來到你的專屬跆拳道賽事 DIY 組裝包！
正如組裝一個書櫃，呢個 **Frontend-only (純前端)** 系統為觀眾、賽事管理員同邊線裁判提供「一啪即合」嘅無縫體驗。你唔需要準備六角匙——一個 Google 帳號、一部手機，開波！

> 多裝置同步、資料庫 schema、搶位細節 → [`docs/FIREBASE_MULTI_DEVICE_DESIGN.md`](docs/FIREBASE_MULTI_DEVICE_DESIGN.md)

---

## 📦 產品組件 (Key Features)

* **Live Scoreboard (大螢幕)**：Firebase 實時同步；玻璃質感 QR Code；HKTKDA PDF 自動解析 Match 同選手
* **Mobile Controller (手機遙控)**：免裝 App；Transaction 搶 J1–J3 席位，斷線自動讓座；Multiple Mode 下 2+ 裁判 **1 秒內**同分先加
* **Technical Card (技術警告牌)**：主裁 Edit 確認 → Firebase 同步公告 glass card 到**同一場地所有 Screen**（3 秒；Reject 延遲 Gam-jeom +1）
* **Admin (管理後台)**：Toast / Modal 取代醜樣 Alert；Delete 只刪單場 Match；淘汰樹狀圖自動排版晉級路徑

---

## 🔄 點樣運作 (How It Works)

### 現場七步曲

```
Court Setup → Data Import (Load Match) → Screen 開波 (Space 計時, Q 出 QR)
→ Controller 掃碼搶位 → Firebase 同步計分 → Edit 判勝 / REST → Promote Winner 晉級
```

| 路由 | 做咩 |
|------|------|
| `/court-setup` | Google 登入、建 Event、揀 Court |
| `/` | Home 導航 |
| `/screen` | 大螢幕；`E` 開 Edit 主裁面板 |
| `/controller` | 邊裁遙控（可經 QR `?event=&court=` 直入） |
| `/import` | Match 管理、Load 到 Court、Bracket |

**Session**：Court Setup 後 `{ eventId, courtId }` 存入 `sessionStorage`；`ProtectedRoute` 守護其餘路由。

**計分**（`src/Api.js`）：Single Mode 一按即加；Multiple Mode 靠 `votes` + `VOTE_WINDOW_MS = 1000`；自動 PTG / PUN；REST 禁改分。Controller 六掣對應 `pointsStat[0–4]` → +1 / +2 / +3 / +4 / +6 分。

**搶位**（`Controller.jsx`）：`runTransaction` 試 J1→J3 → `onDisconnect().remove()`；Paused 禁畀分；Google Admin 唔佔席位。

**Load Match**：寫入 `courts/{courtId}/currentMatchId`，Screen / Controller 即時跟住變。

**Technical Card**：主裁喺 Edit 按 Accept/Reject → `state.techCardAnnouncement` 寫入 Firebase → 同 Court 所有 `/screen` 顯示 3 秒 glass card → `finalizeTechCardAnnouncement` 清除（Reject 先加 Gam-jeom）。

---

## 🛠️ 組裝說明 (Tech Stack & Commands)

| 零件 | 技術 |
|------|------|
| 層板 | React 18, Vite, React Router v6 |
| 鉸鏈 | Firebase Realtime Database + Google Auth（**冇 backend server**） |
| 漆油 | Vanilla CSS, Glassmorphism, `cqi` |
| 說明書翻譯機 | pdfjs-dist |

部署：**GitHub Pages**，`base: '/TKD-scoreboard/'`。計分大腦 → `src/Api.js`；Firebase → `src/firebase.js`。

```bash
npm install && npm run dev    # 試裝
npm run build && npm run deploy   # 装箱上架
npm run lint                  # 检查螺丝
```

---

## 🗺️ 邊度放咩 (Source Map)

| 檔案 | 做咩 |
|------|------|
| `src/App.jsx` | 路由 |
| `src/Api.js` | 計分、回合、晉級 |
| `src/firebase.js` | Firebase 初始化 |
| `src/Context/AuthContext.jsx` | 登入 + session |
| `src/Context/PopupContext.jsx` | Toast / Modal |
| `src/Pages/CourtSetup/` | 建 Event、PDF 匯入 |
| `src/Pages/DataImport/` | Match CRUD、Load、Bracket |
| `src/Pages/Screen/Screen.jsx` | 大螢幕 |
| `src/Pages/Screen/Edit.jsx` | 主裁改分、Technical Card 確認 |
| `src/Pages/Controller/` | 邊裁搶位、遙控 |
| `src/Components/QRCodeDisplay/` | QR、裁判模式 |
| `src/Components/TechnicalCardFlow/` | Technical Card 確認 + 公告 glass card |
| `src/Utils/pdfParser.js` | HKTKDA PDF 解析 |
| `database.rules.json` | 安全規則 |

**改 UI**：一元件一 CSS，用 `.aurora-bg` + `.glass-card`。**唔好改 `dist/`**。

---

## 🤖 給 AI 同開發者 (Agents & Devs)

人類同機械人睇同一份說明書就夠。加功能優先改 `src/Pages` / `src/Components`；改 Firebase schema 要連 Screen、Controller、Api 一齊諗。

| 症狀 | 先睇 |
|------|------|
| 分數 / 規則錯 | `Api.js` |
| 大屏 ⟷ 手機唔同步 | `Screen.jsx` + `Controller.jsx` |
| 搶位 / 斷線 | `Controller.jsx` |
| QR / 裁判人數 | `QRCodeDisplay.jsx` |
| Technical Card 公告 | `TechnicalCardFlow/`、`Api.js`、`Screen.jsx` |
| PDF / Match | `DataImport.jsx`, `pdfParser.js` |
| Event 建刪 | `CourtSetup.jsx` |

---

## ⚠️ 安全 · 🚧 未入盒 · 📚 延伸

**Court-level Locking**：坐正 J1–J3 嘅 `deviceId` 先改分；Admin 靠 Google auth；Event 靠建立者。詳見 `database.rules.json`。**請勿讓兒童吞食。**

**計劃中**：Persistent Token 重連、hostStatus 離線警示、**IVR**（[`TODO_WT2026.md`](TODO_WT2026.md)）

**已實作（WT 2026）**：Technical Card — 見 [`TODO_WT2026.md`](TODO_WT2026.md#technical-card已實作)

**深入閱讀**：[`FIREBASE_MULTI_DEVICE_DESIGN.md`](docs/FIREBASE_MULTI_DEVICE_DESIGN.md) · [`TODO_WT2026.md`](TODO_WT2026.md) · [`package.json`](package.json)

---

*設計於香港，組裝於互聯網。MIT License.*
