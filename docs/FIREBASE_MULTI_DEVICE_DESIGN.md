# TKD-scoreboard 多裝置實時互動設計文件
(TKD-scoreboard Multi-device Real-time Interaction Design Document)

> **文件狀態**：反映 **2026-08** 源碼現況。  
> 標有 **〔計劃中〕** 嘅功能尚未實作，唔好當成已上線行為。

---

## 1. 系統概述 (System Overview)

本系統係 **Frontend-only (純前端)** 跆拳道 **Kyorugi (搏擊)** 計分應用，透過 **Firebase Realtime Database (即時資料庫)** 同步：

| 角色 | 頁面 | 裝置 |
|------|------|------|
| 賽事管理員 | `CourtSetup`、`DataImport` | 電腦 + Google 帳號 |
| 大螢幕 Host | `Screen`、`Home` | 投影／電視 |
| 邊裁 Corner Judge | `Controller` | 手機（掃 QR Code，免安裝） |

**已實作核心能力**：

- **Dynamic QR Code (動態二維碼)**：按 `eventId` + `courtId` 生成 Controller 連結
- **Slot-based Seating (席位制)**：每 Court 固定 `J1`、`J2`、`J3` 三個席位
- **Atomic Transaction (原子事務) 搶位**：逐席位 `runTransaction()`，防 **Race Condition (競態條件)**
- **onDisconnect() Cleanup (斷線清理)**：離線自動 `remove()` 席位節點
- **Valid Point Voting (有效得分投票)**：Multiple Mode 下 2+ 裁判 **1 秒內**同投同分先加分
- **Court-level Write Lock (場地級寫入鎖)**：`database.rules.json` 限制只有佔位 `deviceId` 或已登入 Admin 可改分

**〔計劃中，未實作〕**：

- **Persistent Token (持久化權杖)** + `localStorage` 重連
- **`hostStatus`** 大螢幕在線狀態同 Controller 離線警示

---

## 2. 路由與 Session (Routing & Session)

```
/court-setup     → 公開；Google 登入、建立／選擇 Event、選 Court
/                → Home 導航（需 session）
/screen          → 大螢幕計分板
/controller      → 手機裁判（可 ?event=&court= 直入）
/import          → 管理後台（Match CRUD、Load、Bracket）
```

**Session (工作階段)** 存於 `sessionStorage`：

```json
{ "eventId": "...", "courtId": "court1", "eventName": "..." }
```

由 `AuthContext.login()` 寫入；`ProtectedRoute` 檢查 session、`sessionStorage` 或 URL query。

**Google Authentication (Google 認證)**：用於建立／刪除 Event、Admin 後台；裁判手機 **唔使** Google 登入。

---

## 3. 資料庫架構 (Database Schema)

```
events/{eventId}/
├── EventName, createdBy, createdByEmail, settings, matchDate
├── settings/
│   ├── setupPassword
│   ├── maxPointGap, maxGamjeom, roundDuration, restDuration
├── courts/{courtId}/
│   ├── name
│   ├── currentMatchId          ← 而家邊場比賽喺呢個 Court
│   ├── config/
│   │   └── refereeMode         ← "single" | "multiple"
│   └── referees/
│       ├── J1                  ← { deviceId, deviceName } 或 null（節點不存在）
│       ├── J2
│       └── J3
└── matches/{matchId}/
    ├── config/
    │   ├── matchId, competitors.{red,blue}, rules
    │   ├── nextMatchId, nextMatchSlot   ← 晉級路徑
    │   └── matchDate
    ├── state/
    │   ├── timer, isPaused, lastStartTime, phase ("ROUND"|"REST")
    │   ├── currentRound, isFinished, winReason, winnerSide, dominantSide
    └── stats/
        ├── red/blue: pointsStat[5], gamjeom, gamjeomAvoiding
        ├── roundWins, roundScores
    ├── votes[]                   ← Multiple Mode 暫存投票（1 秒窗口）
    ├── recentScores[]            ← 大螢幕得分紀錄
    ├── providedCourtId           ← Transaction 時暫寫，供 Rules 驗證（副作用）
    └── providedDeviceId
```

### 3.1 裁判席位（現況）

**空位** = Firebase 節點 **不存在** 或值為 `null`（唔再用 `status: "vacant"` 字串）。

**已佔位**：

```json
"J1": { "deviceId": "abc123xyz", "deviceName": "iPhone" }
```

### 3.2 Match 分數結構

`pointsStat` 索引對應：

| Index | 分數 | 類型 |
|-------|------|------|
| 0 | 1 | Punch (拳) |
| 1 | 2 | Body (軀幹) |
| 2 | 3 | Head (頭) |
| 3 | 4 | Turning Body (旋轉軀幹) |
| 4 | 6 | Turning Head (旋轉頭) |

**總分** = `Σ(pointsStat[i] × [1,2,3,4,6])` + 對手 `gamjeom` + 對手 `gamjeomAvoiding`

---

## 4. 核心運作流程 (Core Operation Flow)

```
[Admin 電腦]                         [Firebase]                          [Screen 大螢幕]     [Controller 手機]
     |                                    |                                    |                    |
     | CourtSetup: 建 Event + 揀 Court -->|                                    |                    |
     | DataImport: Load Match ----------->| currentMatchId 寫入 court -------->| onValue 載入 match |
     |                                    |                                    |                    |
     |                                    |                                    | Q 開 QR Code ----->| 掃碼
     |                                    |<----------- runTransaction J1-J3 --|                    |
     |                                    | onDisconnect().remove() 註冊 ------|                    |
     |                                    |                                    |                    |
     |                                    |<--- updateScoreAndCheckRules ------| 撳分（timer 運行中）|
     |                                    |--- onValue 同步 match ------------>| 即時更新比分        |
     |                                    |                                    |                    |
     | Edit: 宣告回合勝者 / Promote ----->| declareRoundWinner / promoteWinner |                    |
```

### 4.1 開賽標準流程

1. **CourtSetup**：Google 登入 → 建立或選擇 Event → 選 Court →（非建立者輸入 `setupPassword`）→ 進 Home
2. **DataImport**：選 Match → **Load** → 寫入 `courts/{courtId}/currentMatchId`
3. **Screen**：全屏顯示；`Space` 開始／暫停計時；`E` 開 Edit 面板
4. **QRCodeDisplay**：生成 `/controller?event=X&court=Y`；可切 **Single / Multiple** 裁判模式
5. **Controller**：自動搶 J1→J2→J3；**僅在 `isPaused === false` 時**可遙控加分
6. 回合結束 → Edit **Winner** → REST 倒數 → 自動 `startNextRound`
7. 贏夠局數 → **Promote Winner** 寫入下一場 `competitors` 名單

### 4.2 搶位（現況實作 — `Controller.jsx`）

1. 生成 random `deviceId`
2. 依次對 `referees/J1`、`J2`、`J3` 做 `runTransaction`：節點為 `null` 則寫入 `{ deviceId, deviceName }`
3. 成功後 `onDisconnect(seatRef).remove()`
4. 三席皆滿 → 顯示 "Court is Full"
5. **Google 登入用戶**顯示 `Admin`，唔寫入 Firebase 席位（改分靠 `auth != null` Rules 路徑）
6. React StrictMode 下加 **400ms delay** 避免 double-mount 搶位衝突

### 4.3 計分（`Api.js` — `updateScoreAndCheckRules`）

**Single Mode**：一次按鈕即加分（若 timer 運行中）。

**Multiple Mode**：

1. 推送 vote 到 `match.votes[]`（含 `side, index, seatName, deviceId, timestamp`）
2. 只保留 **最近 1000ms** 內嘅 votes
3. 同一 `side + index` 有 **≥2 個不同 `deviceId`** → 加分並清除該組 votes
4. 寫入 `recentScores` 供 Screen 顯示

**自動判勝**（寫入 `state.winReason` 並 pause timer）：

- `PUN`：任一方 `gamjeom >= maxGamjeom`
- `PTG`：分差 `>= maxPointGap`

**REST 階段**：`phase === 'REST'` 時拒絕加分。

### 4.4 大螢幕監聽（`Screen.jsx`）

- 監聽 `currentMatchId`、`matches/{id}`、`referees`
- 本地 `requestAnimationFrame` 倒數 timer；歸零 → 完賽或 `startNextRound`
- 裁判斷線 → Toast 提示
- 在線裁判 **< 2** → 自動將 `refereeMode` 降回 `single`
- 裁判連線狀態主要顯示於 **QR Modal** 同 **Edit**（`(n/3)`），主計分板無常駐 Badge

---

## 5. Firebase Security Rules（現況）

源碼：`database.rules.json`（**唔係**全開 `.write: true`）

| 路徑 | 寫入條件（摘要） |
|------|------------------|
| `events/{eventId}` | 已登入 + 為 `createdBy` 或 `coAdmins` |
| `events/.../referees/{slot}` | 已登入 **或** 搶位／斷線（`null`） |
| `events/.../matches/{matchId}` | 已登入 **或** Transaction 帶 `providedDeviceId` 且匹配 J1/J2/J3 席位 |

未登入裁判改分時，`Api.js` 會在 transaction 內寫入 `providedCourtId` / `providedDeviceId` 供 Rules 驗證。

Admin 喺 **Edit 面板**改分不傳 `deviceId`，走 **auth != null** 路徑。

---

## 6. 主要源碼對照 (Source File Map)

| 職責 | 檔案 |
|------|------|
| 計分 Transaction | `src/Api.js` |
| 路由 / Provider | `src/App.jsx` |
| Session / Google Auth | `src/Context/AuthContext.jsx` |
| 搶位 + 手機 UI | `src/Pages/Controller/Controller.jsx` |
| 大螢幕 + Timer | `src/Pages/Screen/Screen.jsx` |
| 管理員計分面板 | `src/Pages/Screen/Edit.jsx` |
| QR + 裁判模式 | `src/Components/QRCodeDisplay/QRCodeDisplay.jsx` |
| Event / Match 管理 | `src/Pages/CourtSetup/CourtSetup.jsx`、`DataImport.jsx` |
| PDF 匯入 | `src/Utils/pdfParser.js` |
| 淘汰樹 | `src/Components/TournamentBracket/TournamentBracket.jsx` |

---

## 7. 邊緣情況（現況行為）

| 情況 | 現況 |
|------|------|
| 3 席已滿 | Controller 顯示 "Court is Full" |
| 裁判斷線 | `onDisconnect` 清除席位；Screen Toast |
| 裁判 refresh 瀏覽器 | **重新搶位**（無 Token 恢復）〔計劃中改善〕 |
| 大螢幕關閉 | **無** `hostStatus` 同步〔計劃中〕 |
| Multiple 只剩 1 裁判 | 自動降級 Single Mode |
| Timer 暫停 | Controller 禁加分；Screen `Space` 可 toggle |
| Gam-jeom 最後 10 秒 | Edit 彈窗選 1-Jeom / 2-Jeom (Avoiding) |

---

## 8. 〔計劃中〕功能備忘

以下曾出現喺早期設計或 `TODO_WT2026.md`，**源碼尚未完成**：

1. **`localStorage` Token 重連** — 誤 refresh 後恢復原席位
2. **`hostStatus`** — Screen 離線時通知 Controller
3. **IVR (Instant Video Replay)** — Edit.jsx 仅有 UI stub
4. **Technical Card** — 同上
5. **大螢幕常駐 J1/J2/J3 Badge** — 現只在 QR Modal

---

*文件建立：2026-07-30 · 現況對齊更新：2026-08-10*  
*專案：TKD-scoreboard*
