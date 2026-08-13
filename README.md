# Taekwondo Cloud Scoring System  
# 跆拳道雲端計分系統

**Kyorugi（搏擊）** · Frontend-only · Firebase Realtime · Google 一鍵開賽

現場大螢幕、主裁面板、邊裁手機遙控同一個 Event／Court 即時同步。唔使裝 App：掃 QR，部手機就係計分手掣。

> Live demo：[`https://cy-cheung.github.io/TKD-scoreboard/`](https://cy-cheung.github.io/TKD-scoreboard/)  
> 現場操作詳情 → [`docs/5_User_Manual.md`](docs/5_User_Manual.md)  
> Schema／多裝置 → [`docs/FIREBASE_MULTI_DEVICE_DESIGN.md`](docs/FIREBASE_MULTI_DEVICE_DESIGN.md)

---

## Features（功能）

- **Live Sync（即時同步）** — 大螢幕同裁判手機即時同步分數同狀態。
- **Scan & Score（掃碼即用）** — 掃 QR，手機變計分手掣。
- **One Account（一鍵開賽）** — Google 登入即可開賽，無須安裝軟件。
- **Multi-Court（多場地）** — 每個 Court 各自 Load 比賽；大螢幕同邊裁跟住該場。

**亦已支援：** Technical Card（技術卡）、IVR（留空配額 = 無限 `-1`）、HKTKDA PDF（Court Setup）、Tournament Bracket、Chi／Eng fade。

> **用語：** Technical Card 中文一律「技術卡」。雙語標籤：`English（中文）`。

---

## Who uses it（角色）

| Persona | 裝置 | 要 Google？ | 主要工作 |
|---------|------|-------------|----------|
| Event Admin | 筆電／平板 | 要 | 建 Event、PDF、Manage Match、Load |
| Court Operator | 接大螢幕電腦 | Session | 計時、QR、開 Screen |
| Centre Referee | 同 Screen（Edit） | Session | 改分、判勝、TC／IVR、Promote |
| Corner Judge J1–J3 | 手機瀏覽器 | **唔使** | 掃 QR 搶席、按得分 |

---

## Five-minute start（五分鐘開賽）

1. 打開網站 → **Google 登入**（Landing）。  
2. **Court Setup**：建／揀 Event（可上傳 HKTKDA PDF）→ 揀 Court。  
3. **Home** → **Manage Match**：新增或揀場 → **Load**。  
4. 開 **Scoreboard**；`Space` 計時；`Q` 出 QR。  
5. 邊裁掃碼入 **Controller** 搶 J1–J3 → 按得分。  
6. 主裁按 `E` 開 Edit：Gam-jeom、判勝、Technical Card、IVR、Promote Winner。

詳步同 FAQ → [`docs/5_User_Manual.md`](docs/5_User_Manual.md)。

```
Landing → Court Setup（Event / Court / PDF）→ Home
  → Manage Match（Load）→ Screen（Space / Q / E）
  → Controller 掃碼計分 → Edit 完場／晉級
```

---

## Routes（路由）

| Path | Page | Access |
|------|------|--------|
| `/` | Landing — 產品介紹、Google 登入 | Public |
| `/court-setup` | Court Setup — 建 Event、Court、PDF | Google |
| `/home` | Home — 導航、QR | Session |
| `/screen` | Screen — 大螢幕；`E` = Edit | Session |
| `/controller` | Controller — 邊裁（可 `?event=&court=`） | Session 或 URL |
| `/import` | Manage Match — CRUD／Load／Bracket（**唔**建 Event） | Session |

**Session**：`EventSessionContext` 寫 `sessionStorage`（`selectedEvent`／`selectedCourt`／`selectedEventName`）。  
`ProtectedRoute` 無 session → **`/`（Landing）**。已 Google 登入會由 Landing 轉去 `/court-setup`。

| Context | 職責 |
|---------|------|
| `AuthContext` | Google 登入／登出 only |
| `EventSessionContext` | Event／Court session |

---

## Scoring & seats（計分同搶位）

- **Single**：一按即加；**Multiple**：`VOTE_WINDOW_MS = 1000` 內 ≥2 唔同 `deviceId` 同意先加  
- 掣 → `pointsStat[0–4]` → +1／+2／+3／+4／+6；Gam-jeom 喺 Edit  
- 自動 PTG／PUN；REST 禁改分；IVR 配額 **match-scoped**  
- `updateScoreAndCheckRules` → `Promise<{ committed, scored }>`  
- 搶位：`runTransaction` J1→J3 + `onDisconnect().remove()`；Paused 禁畀分；Google Admin 唔佔席  
- Controller：無 top bar；landscape browser content-box shell  
- Screen：`useBrowserShellSize("screen-2x1")`

---

## Tech stack（技術）

| Layer | Choice |
|-------|--------|
| UI | React 19, Vite 5, React Router 7 |
| Data / Auth | Firebase RTDB + Google Auth（**無**自建 backend） |
| Style | Vanilla CSS, `cqi`, Arial（`--app-font`） |
| PDF | pdfjs-dist |
| Motion | `gsap` |
| Deploy | GitHub Pages · `base: '/TKD-scoreboard/'` |
| Test | Vitest — `npm test`（263）；rules — `npm run test:rules`（11） |

```bash
npm install
npm run dev          # --host
npm run build        # dist/ + 404.html
npm run deploy
npm run lint
npm test
npm run test:rules
```

---

## Source map（目錄）

| Path | Role |
|------|------|
| `src/App.jsx` | Routes |
| `src/Api.js` | 計分、回合、TC、IVR |
| `src/domain/` / `src/services/` | 純邏輯／RTDB I/O |
| `src/Context/` | Auth、EventSession、Popup |
| `src/Pages/` | Landing、CourtSetup、Home、Screen、Controller、DataImport |
| `src/Components/` | QR、TechnicalCardFlow、IVRFlow、Bracket、AlternatingLocale |
| `src/Utils/browserShellSize.js` | Screen 2:1／Controller landscape |
| `database.rules.json` | RTDB rules |

**改 UI**：一頁一 CSS；**唔好改 `dist/`**。改 schema 要齊 Screen、Controller、`Api.js`、rules。

### Debug map

| Symptom | Start here |
|---------|------------|
| 分數／規則 | `Api.js`、`domain/` |
| 唔同步 | `Screen.jsx` + `Controller.jsx` |
| 搶位／斷線 | `Controller.jsx` |
| TC／IVR | `*Flow/`、`Edit.jsx`、`Api.js` |
| PDF／建賽 | `CourtSetup`、`persistCreatedEvents` |
| Match／Load | `DataImport.jsx` |

---

## Docs（文件）

| Doc | 用途 |
|-----|------|
| **本 README** | 產品入口、角色、開賽、路由、技術摘要 |
| [`docs/5_User_Manual.md`](docs/5_User_Manual.md) | 現場操作指南（粵語） |
| [`docs/FIREBASE_MULTI_DEVICE_DESIGN.md`](docs/FIREBASE_MULTI_DEVICE_DESIGN.md) | Schema、搶位、同步、TC／IVR（**canonical**） |
| [`docs/archive/`](docs/archive/) | 歷史封存：PRD、System Design、API、Test Plan、flatten／refactor 計劃 |

**Security：** J1–J3 `deviceId` 先可改分；Admin 靠 Google；Event 靠建立者 — 見 `database.rules.json`。

---

*Designed in Hong Kong. Assembled on the internet.*
