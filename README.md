# Taekwondo Cloud Scoring System  
# 跆拳道雲端計分系統

**Kyorugi（搏擊）** · Frontend-only · Firebase Realtime · Google 一鍵開賽

現場大螢幕、主裁面板、邊裁手機遙控同一個 Event／Court 即時同步。唔使裝 App：掃 QR，部手機就係計分手掣。

> Live demo（GitHub Pages）：[`https://cy-cheung.github.io/TKD-scoreboard/`](https://cy-cheung.github.io/TKD-scoreboard/)  
> 多裝置同步、資料庫 schema、搶位細節 → [`docs/FIREBASE_MULTI_DEVICE_DESIGN.md`](docs/FIREBASE_MULTI_DEVICE_DESIGN.md)  
> RTDB 扁平化（已完成）→ [`docs/FIREBASE_FLATTENING_PLAN.md`](docs/FIREBASE_FLATTENING_PLAN.md)

---

## Features（功能）

| | EN | 中文 |
|--|----|------|
| **Live Sync** | Scores update instantly on every screen and device. | 大螢幕同裁判手機即時同步。 |
| **Scan & Score** | Scan. Your phone = score remote. | 掃一掃，手機變手掣。 |
| **One Account** | Sign in with Google to create and run your event. | Google 登入即可開賽，無須安裝軟件。 |
| **Multi-Court** | Load a match per court — screens and phones stay aligned. | 多個 Court 同步作賽，Load 邊場跟邊場。 |

**亦已支援**

- **Technical Card（技術卡）**：主裁於 Edit 確認 → Firebase 同步公告到同一場地所有 Screen（3 秒；Reject 延遲 Gam-jeom +1）
- **IVR（Instant Video Replay）**：挑戰卡流程、配額（可無限）、多 Screen 公告

> **用語：** 中文一律用「技術卡」對譯 Technical Card（唔用「技術警告牌」「技術牌」）。英文專有名詞保留 `Technical Card`；雙語標籤格式：`English（中文）`。
- **HKTKDA PDF 匯入**：解析對陣表 → Match／選手
- **Tournament Bracket**：晉級路徑、Promote Winner
- **中英交替 UI**：關鍵頁面 Chi／Eng fade（`AlternatingLocale`）

---

## How it works（點樣運作）

### 現場流程

```
Landing（Google）→ Court Setup（Event / Court）→ Home
  → Data Import（Load Match）→ Screen 開波（Space 計時，Q 出 QR）
  → Controller 掃碼搶 J1–J3 → Firebase 同步計分
  → Edit 判勝 / REST / Technical Card / IVR → Promote Winner
```

### Routes（路由）

| Path | Page | Access |
|------|------|--------|
| `/` | **Landing** — 產品介紹、Google 登入 | Public |
| `/court-setup` | **Court Setup** — 建 Event、揀 Court、PDF | Google 登入 |
| `/home` | **Home** — 導航、QR、場地資訊 | Session（event + court） |
| `/screen` | **Screen** — 大螢幕計分；`E` 開 Edit | Session |
| `/controller` | **Controller** — 邊裁遙控（可 `?event=&court=` 直入） | Session 或 URL params |
| `/import` | **Manage Match** — Match CRUD、Rules、Load、Bracket | Session |

**Session**：Court Setup 成功後將 `{ eventId, courtId }` 寫入 `sessionStorage`；`ProtectedRoute` 守護 `/home`、`/screen`、`/controller`、`/import`。無 session 時導向 `/court-setup`（唔再誤踢去 Landing 清 Google）。

**計分**（`src/Api.js`）

- Single Mode：一按即加  
- Multiple Mode：`votes` + `VOTE_WINDOW_MS = 1000`（約 1 秒內同分先加）  
- Controller 六掣 → `pointsStat[0–4]` → +1 / +2 / +3 / +4 / +6；另有 Gam-jeom  
- 自動 PTG／PUN；REST 期間禁改分；IVR 配額屬 **match-scoped**（換回合唔會重置）

**搶位**（`Controller.jsx`）：`runTransaction` 佔 J1→J3 → `onDisconnect().remove()`；Paused 禁畀分；已 Google 登入嘅 Admin 唔佔邊裁席。

---

## Tech stack（技術）

| Layer | Choice |
|-------|--------|
| UI | React 19, Vite 5, React Router 7 |
| Data / Auth | Firebase Realtime Database + Google Auth（**冇自建 backend**） |
| Style | Vanilla CSS, glassmorphism, `cqi` container queries, Inter |
| PDF | pdfjs-dist（HKTKDA 對陣表） |
| Deploy | GitHub Pages · `base: '/TKD-scoreboard/'` |

核心檔：計分 → `src/Api.js`；Firebase → `src/firebase.js`。

```bash
npm install
npm run dev          # 本地開發（--host）
npm run build        # 產出 dist/（並複製 404.html 畀 Pages）
npm run deploy       # gh-pages 上架
npm run lint
```

---

## Source map（目錄）

| Path | Role |
|------|------|
| `src/App.jsx` | Routes + basename |
| `src/Api.js` | 計分、回合、勝負、Technical Card、IVR |
| `src/firebase.js` | Firebase init |
| `src/Context/AuthContext.jsx` | Google auth + event/court session |
| `src/Context/PopupContext.jsx` | Toast / Confirm modal |
| `src/Pages/Landing/` | Marketing + Google 登入入口 |
| `src/Pages/CourtSetup/` | Event／Court、PDF 建立賽事 |
| `src/Pages/Home/` | 賽事主選單、QR |
| `src/Pages/Screen/` | 大螢幕 + `Edit.jsx` 主裁底欄 |
| `src/Pages/Controller/` | 邊裁搶位、遙控（無 top bar；landscape shell） |
| `src/Pages/DataImport/` | Manage Match、Rules、Bracket |
| `src/domain/` | 純計分／規則 helpers（如 `scoreMath`） |
| `src/services/` | RTDB path helpers + court／match I/O |
| `src/Components/QRCodeDisplay/` | QR、裁判模式（helpers + Status／Mode／Host panels） |
| `src/Components/TechnicalCardFlow/` | Technical Card 確認 + 公告 |
| `src/Components/IVRFlow/` | IVR 確認 + 公告 |
| `src/Components/AlternatingLocale/` | Chi／Eng fade |
| `src/Components/TournamentBracket/` | 淘汰樹 |
| `src/Utils/pdfParser.js` | HKTKDA PDF |
| `src/Utils/browserShellSize.js` | Browser content-box shell fit（Screen／Controller） |
| `src/constants/landingFeatures.js` | Landing／Home 文案 |
| `database.rules.json` | RTDB 安全規則 |

**改 UI**：一頁／一元件配一 CSS；共用 `.aurora-bg`、`.glass-card`。**唔好改 `dist/`**。

---

## For agents & developers（開發／AI）

加功能優先改 `src/Pages`／`src/Components`。改 Firebase schema 要同時對齊 Screen、Controller、`Api.js`、rules。

| Symptom | Start here |
|---------|------------|
| 分數／規則錯 | `Api.js` |
| 大屏 ⟷ 手機唔同步 | `Screen.jsx` + `Controller.jsx` |
| 搶位／斷線 | `Controller.jsx` |
| QR／裁判人數 | `QRCodeDisplay/`（`QRCodeDisplay.jsx` + `qrRefereeView`／panels） |
| Technical Card | `TechnicalCardFlow/`、`Api.js`、`Screen.jsx`、`Edit.jsx` |
| IVR | `IVRFlow/`、`Api.js`、`Edit.jsx` |
| PDF／Match | `DataImport.jsx`、`pdfParser.js` |
| Event 建刪／登入流向 | `Landing.jsx`、`CourtSetup.jsx`、`AuthContext.jsx` |
| Chi／Eng fade | `AlternatingLocale/` |

---

## Security & docs（安全同文件）

- **Court-level locking**：坐正 J1–J3 嘅 `deviceId` 先可以改分；Admin 靠 Google；Event 靠建立者。詳見 `database.rules.json`。
- **Auth**：Landing 負責 Google 登入；Court Setup 需要已登入 user；Home Logout 會清 Google 並返 Landing。

| Doc | Content |
|-----|---------|
| [`docs/FIREBASE_MULTI_DEVICE_DESIGN.md`](docs/FIREBASE_MULTI_DEVICE_DESIGN.md) | 多裝置、schema、同步 |
| [`docs/FIREBASE_FLATTENING_PLAN.md`](docs/FIREBASE_FLATTENING_PLAN.md) | RTDB 扁平化（完成） |
| [`TODO_WT2026.md`](TODO_WT2026.md) | WT 2026 規格（IVR／Technical Card 等） |
| [`package.json`](package.json) | Dependencies & scripts |

---

*Designed in Hong Kong. Assembled on the internet.*
