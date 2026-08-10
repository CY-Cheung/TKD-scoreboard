# Product Requirements Document (產品需求文件)

**Product:** Taekwondo Cloud Scoring System（跆拳道雲端計分系統）  
**Scope:** Kyorugi（搏擊）現場雲端計分  
**Repo:** `CY-Cheung/TKD-scoreboard`  
**Document status:** Reverse-engineered from source（`README.md`、`src/`、`database.rules.json`）  
**Last reviewed against code:** 2026-08-10

> 凡標 **`[待確認]`** 者：程式碼或文件未能完全證實，請勿當已上線功能。

---

## 1. Vision & goals（願景與目標）

### 1.1 Core goal（核心目標）

喺跆拳道 **Kyorugi（搏擊）** 比賽現場，提供一套 **唔使安裝原生 App** 嘅瀏覽器計分系統，令：

1. **大螢幕（Screen）**、**主裁面板（Edit）**、**邊裁手機遙控（Controller）** 共用同一個 Event／Court，經 Firebase Realtime Database（即時資料庫）即時同步；
2. **賽會管理員** 用 Google 帳號建立賽事、載入對陣、管理多個 Court；
3. **邊裁** 掃 QR Code 即可搶席位（J1–J3）並遙控得分。

### 1.2 Non-goals（非目標／未見實作）

| Item | Status |
|------|--------|
| 自建 HTTP REST backend / Express API | **無**（client + Firebase） |
| Firebase Cloud Functions | **未見** `/functions` 或相關部署 |
| Poomsae（品勢）計分 | **未見**；產品明確定位 Kyorugi |
| 原生 iOS／Android App | **無**；手機用瀏覽器開 Controller |
| 線上付款／購票 | **未見** |
| `coAdmins` 協作者管理 UI | Rules 有欄位；**src 未見寫入 UI** → `[待確認]` 是否已產品化 |

---

## 2. Target audience（受眾）

| Persona | 典型裝置 | 進入方式 | 主要工作 |
|---------|----------|----------|----------|
| **Event Admin（賽事管理員）** | Laptop／平板 | Landing → Google 登入 → Court Setup | 建／刪 Event、設 setup password、Manage Match、Load Match |
| **Court Operator（場地操作員／Screen host）** | 接大螢幕嘅電腦 | Session 後開 `/screen` | 計時、顯示比分、出 QR、開 Edit |
| **Centre Referee（主裁）** | 同 Screen 或另開 Edit 底欄 | Screen 按 `E` 或點 Gam-jeom | 改分、判勝、Kye-shi、Technical Card、IVR、Promote Winner |
| **Corner Judge（邊裁 J1–J3）** | 手機瀏覽器 | 掃 QR → `/controller?event=&court=`（**唔使** Google） | 搶席、按得分掣 |
| **Google-logged Admin on Controller** | 已登入裝置開 `/controller` | 程式將席位視為 `Admin` | **唔佔** J1–J3 Firebase 席位；可直接計分（single／視 mode） |

**現場觀眾**：可睇大螢幕；**無**獨立觀眾帳號或公開只讀入口（除 RTDB `.read: true` 令資料理論上可被直接讀）→ 觀眾產品意圖以現場運作為主。

---

## 3. User stories（用戶故事）

### 3.1 Authentication & session（登入與場地工作階段）

| ID | As a… | I want to… | So that… |
|----|-------|------------|----------|
| US-01 | Event Admin | 用 Google 一鍵登入 | 唔使另外註冊帳號系統 |
| US-02 | Event Admin | 建立 Event 並設定 setup password 同預設規則 | 控制邊個可以進入該賽事嘅 Court |
| US-03 | Operator | 揀 Event + Court 並通過 password（如需要）寫入 session | 之後各頁都對準同一個場地 |
| US-04 | Operator | 返回 Court Setup 時清走 event／court session，但保留 Google 登入 | 可以換場地而唔使重新 Google |
| US-05 | Corner Judge | 只靠 QR 深連結進入 Controller | 現場唔使登入 Google |

### 3.2 Match management（賽事／場次管理）

| ID | As a… | I want to… | So that… |
|----|-------|------------|----------|
| US-10 | Admin | 手動新增／編輯 Match（選手、規則、IVR quota） | 靈活管理對陣 |
| US-11 | Admin | 匯入 HKTKDA 格式 PDF 對陣表 | 大量場次一次建立 |
| US-12 | Admin | 多日 PDF 自動拆成子 Event | 每日比賽資料分開 |
| US-13 | Admin | Load Match 到某個 Court 嘅 `currentMatchId` | Screen／Controller 跟住該場 |
| US-14 | Admin | 喺 Tournament Bracket 睇晉級樹並 Promote Winner | 勝者寫入下一場 |

### 3.3 Live scoring（現場計分）

| ID | As a… | I want to… | So that… |
|----|-------|------------|----------|
| US-20 | Court Operator | 用 Space 開始／暫停計時 | 控制回合時間 |
| US-21 | Corner Judge | 按 Punch／Body／Head／Turning 等掣加分 | 即時反映有效得分 |
| US-22 | Centre Referee | 喺 Edit 加減分同 Gam-jeom | 糾正或補記 |
| US-23 | System | Single mode 一按即加；Multiple mode 要 ≥2 唔同 `deviceId` 喺 1 秒內同意 | 符合多裁判確認邏輯 |
| US-24 | System | 達 PTG／PUN 自動暫停並標 `winReason` | 主裁可跟住判局 |
| US-25 | Centre Referee | 宣判局勝 → REST → 自動或手動進入下一回合；達 `roundsToWin` 則 PTF 完場 | 完成一場比賽流程 |

### 3.4 Official procedures（官方流程）

| ID | As a… | I want to… | So that… |
|----|-------|------------|----------|
| US-30 | Centre Referee | 發起 Technical Card（Accept／Reject） | 所有 Screen 同步 3 秒公告；Reject 再 +1 Gam-jeom |
| US-31 | Centre Referee | 發起 IVR（Accept／Reject）並管理配額 | 挑戰結果同剩餘次數同步 |
| US-32 | Centre Referee | 啟動／停止 Kye-shi（預設 60 秒） | 處理傷停／暫停程序 |
| US-33 | Centre Referee | 最後約 10 秒加 Gam-jeom 時選擇是否 Avoiding Penalty | 正確累加 `gamjeomAvoiding`（影響對方總分） |

### 3.5 Multi-device operations（多裝置）

| ID | As a… | I want to… | So that… |
|----|-------|------------|----------|
| US-40 | Operator | 用 QR 顯示 Controller 連結同裁判模式（single／multiple） | 邊裁快速入席 |
| US-41 | Corner Judge | 原子搶 J1→J2→J3；斷線自動清席 | 避免席位死鎖 |
| US-42 | Operator | 同時開多個 Court，各自 Load 唔同 Match | 大型賽事並行 |

---

## 4. Core feature inventory（核心功能清單）

### 4.1 Product pillars（產品支柱）

對應 Landing／`landingFeatures.js`：

1. **Live Sync（即時同步）** — 分數與狀態跨裝置更新  
2. **Scan & Score（掃碼即用）** — 手機當計分手掣  
3. **One Account（一鍵開賽）** — Google 登入建立／營運賽事  
4. **Multi-Court（多場地）** — 每 Court 獨立 `currentMatchId`

### 4.2 Feature checklist（功能核對）

| Area | Feature | Primary UI | Domain／API touchpoints |
|------|---------|------------|-------------------------|
| Auth | Google sign-in／sign-out | Landing, CourtSetup, Home | `AuthContext` |
| Session | Event + Court `sessionStorage` | CourtSetup → Protected routes | `EventSessionContext` |
| Event | Create／list／delete Event | CourtSetup, DataImport | `eventCreation` services |
| Event | Setup password gate | CourtSetup | `settings.setupPassword` |
| PDF | HKTKDA parse + multi-day split | CourtSetup, DataImport | `pdfParser`, `eventCreation` |
| Match | CRUD、Rules、IVR quota、Load | DataImport (`/import`) | Firebase `matches`／`courts` |
| Bracket | Tournament tree + Promote | DataImport, Edit | `promoteWinner` |
| Screen | Scoreboard、timer、vote log、QR | `/screen` | listeners + `Api` |
| Edit | Manual score、判勝、TC、IVR、Kye-shi | Screen overlay | `Edit.jsx`, DecisionFlow |
| Controller | Seat grab、score pad | `/controller` | `Controller.jsx`, `updateScoreAndCheckRules` |
| Scoring | Weights 1／2／3／4／6；PUN／PTG／PTF；vote window 1000ms | Api + domain | `scoreMath`, `scoreTransaction`, `roundTransaction` |
| i18n | Chi／Eng alternating fade | Landing 等 | `AlternatingLocale` |

### 4.3 Default match rules（預設規則；可被 Event／Match 覆寫）

| Rule | Default |
|------|---------|
| `maxPointGap`（PTG） | 15 |
| `maxGamjeom`（PUN） | 5 |
| `roundDuration` | 90 seconds |
| `restDuration` | 60 seconds |
| `roundsToWin`（PTF） | 2 |
| Point weights | `[1, 2, 3, 4, 6]` |
| Vote window（Multiple） | `VOTE_WINDOW_MS = 1000` |
| Announcement duration（TC／IVR） | 3000 ms |
| Kye-shi default | 60 seconds |
| Courts per event create | 1–12（CourtSetup）；DataImport create path 見程式 → `[待確認]` 是否永遠只建 `court1` 抑或可選 |

---

## 5. Primary user journeys（主要流程）

```text
Landing（Google）
  → Court Setup（Event / Court [/ PDF]）
  → Home
  → Manage Match（Load Match）
  → Screen（Space 計時，Q 出 QR）
  → Controller 掃碼搶 J1–J3 → 同步計分
  → Edit：判勝 / REST / Technical Card / IVR / Promote Winner
```

鍵盤捷徑（Screen；以程式為準）：

| Key | Action |
|-----|--------|
| `Space` | 開始／暫停計時 |
| `E` | 開關 Edit |
| `Q` | QR overlay |
| `K` | Kye-shi |
| `\` | 紅藍顯示方向切換 |

---

## 6. Success metrics（成功指標 — 推導）

程式庫 **未內建** analytics SDK。以下為產品意圖層面嘅建議指標（**非**已實作遙測）：

| Metric | Why |
|--------|-----|
| Time-to-first-score（由 Load Match 到首個有效得分） | 現場準備效率 |
| Controller seat grab success rate／Court Full 頻率 | 多裁判可用性 |
| Multiple-mode vote agreement rate within 1s | 規則是否符合現場節奏 |
| Sync lag perceived on Screen vs Controller | Live Sync 品質 |

`[待確認]` 產品擁有者是否已有正式 KPI。

---

## 7. Constraints & assumptions（限制與假設）

1. **Frontend-only**：業務邏輯喺瀏覽器執行；安全依賴 `database.rules.json` + Auth／seat `deviceId`。  
2. **Deploy**：GitHub Pages，`base: '/TKD-scoreboard/'`；Firebase config 硬編碼於 `src/firebase.js`（無 `VITE_*` env）。  
3. **Browser session**：Google Auth 使用 `browserSessionPersistence`；另有 `AUTH_SESSION_KEY` workaround。  
4. **公開讀取**：Rules 對 `events` `.read: true` → 假設賽事資料可被知道 URL／path 嘅人讀取。  
5. **WT 2026 規格**：`TODO_WT2026.md` 記載 IVR／TC 驗收細節；若同現場 WT 官方最新條文有出入 → `[待確認]`。

---

## 8. Out-of-scope smells tracked elsewhere

結構／複雜度重構見 `docs/REFACTORING_PLAN.md`（唔屬本 PRD 功能範圍）。  
多裝置同步細節見 `docs/FIREBASE_MULTI_DEVICE_DESIGN.md`。

---

## 9. Document history

| Date | Change |
|------|--------|
| 2026-08-10 | Initial PRD reverse-engineered from repository |
