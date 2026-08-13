# TKD-scoreboard 多裝置實時互動設計文件
(TKD-scoreboard Multi-device Real-time Interaction Design Document)

> **文件狀態**：反映 **2026-08-12** 源碼現況（flat RTDB：`courts`／`matches/…/config`／`matchLive`）。  
> 標有 **〔計劃中〕** 嘅功能尚未實作。  
> Schema 細節 §3；扁平化紀錄 → [`FIREBASE_FLATTENING_PLAN.md`](./FIREBASE_FLATTENING_PLAN.md)。  
> **用語：** Technical Card 中文一律「技術卡」；雙語標籤用 `English（中文）`。

---

## 1. 系統概述 (System Overview)

本系統係 **Frontend-only (純前端)** 跆拳道 **Kyorugi (搏擊)** 計分應用，透過 **Firebase Realtime Database (即時資料庫)** 同步：

| 角色 | 路由 | 裝置 |
|------|------|------|
| 賽事管理 | `/court-setup`、`/import` | 電腦 + Google 帳號 |
| 大螢幕 Host | `/screen` | 投影／電視 |
| 邊裁 Client | `/controller` | 手機（掃 QR Code） |

**已實作核心能力**：

- **Dynamic QR Code（動態二維碼）**：`QRCodeDisplay` 產生 `/controller?event=&court=` 連結
- **Slot-based Referee Seats（席位制）**：每 Court 固定 `J1`、`J2`、`J3`
- **Atomic Transaction（原子事務）搶位**：`Controller.jsx` 對每個席位獨立 `runTransaction()`
- **onDisconnect Cleanup（斷線清理）**：離線時 `remove()` 席位節點
- **Valid Point Voting（有效得分投票）**：Multiple Mode 下 2+ 裁判 **1 秒內**（`VOTE_WINDOW_MS = 1000`）同意先加分
- **Court-level Match Binding（場地綁定比賽）**：`courts/{eventId}/{courtId}/currentMatchId` 驅動 Screen／Controller  
- **One match → one court（約束）**：`matchLive/{event}/{matchId}` 係 **每場一份**（唔按 Court）。同一 `matchId` 唔應同時出現喺兩個 Court 嘅 `currentMatchId`；否則兩場大螢幕／邊裁會共用分數同計時。Load Match（`loadMatchToCourt`）若偵測到其他 Court 已綁定會拒絕。同一 Court 重複 Load 同一場則允許。
- **Technical Card Announcement Sync（技術卡公告同步）**：`state.techCardAnnouncement` 廣播 Step 2 glass card 到同一 Match 嘅所有 Screen；3 秒後 `finalizeTechCardAnnouncement` 原子清除（Reject 延遲 Gam-jeom +1）

**〔計劃中，未實作〕**：

- **Persistent Token（持久化權杖）** + `localStorage` 重連
- **`hostStatus`** 大螢幕在線心跳同 Controller 離線警示

---

## 2. 應用路由同 Session (工作階段)

```
/court-setup     → 需已 Google 登入（否則導回 Landing）；建立／選擇 Event、選 Court
/                → Home 導航（需 session）
/screen          → 大螢幕計分（需 session）
/controller      → 裁判遙控（需 session 或 URL query）
/import          → 管理後台（需 session）
```

**Session** 存於 `sessionStorage`：`selectedEvent`、`selectedCourt`、`selectedEventName`。  
由 `AuthContext.login()` 寫入；`ProtectedRoute` 檢查 session、storage 或 `?event=&court=` query。

**Authentication (認證)**：

- **Google OAuth**：建立／刪除 Event、Admin 操作
- **Setup Password**：非 Event 建立者進入 Court 時需輸入
- **未登入裁判**：可經 QR Code 進入 Controller，靠 `deviceId` 席位寫入 match

---

> **扁平化：** 已完成 — 見 [`docs/FIREBASE_FLATTENING_PLAN.md`](./FIREBASE_FLATTENING_PLAN.md)；  
> production rules：`database.rules.json`（flat courts／matches／matchLive）。

## 3. 資料庫 Schema (現行結構)

```
eventIndex/{eventId}/                 ← 賽事列表摘要
events/{eventId}/                     ← 只 meta + settings
├── EventName, createdBy, createdByEmail, matchDate?
└── settings/
    └── setupPassword, maxPointGap, maxGamjeom, roundDuration, restDuration, ivrQuota?

courts/{eventId}/{courtId}/
├── name
├── currentMatchId                    ← 此 Court 正在進行的 Match
├── config/
│   └── refereeMode                   ← "single" | "multiple"
└── referees/
    ├── J1                            ← { deviceId, deviceName, lastSeen } 或節點不存在
    ├── J2
    └── J3

matches/{eventId}/{matchId}/config/   ← 靜態賽程
├── matchId, competitors.{red,blue}, rules
└── nextMatchId, nextMatchSlot

matchIndex/{eventId}/{matchId}/       ← 對陣表摘要（輕）

matchLive/{eventId}/{matchId}/        ← 即時計分／計時（primary）
├── state/
│   ├── timer, isPaused, lastStartTime, phase ("ROUND"|"REST")
│   ├── currentRound, isFinished, winReason, winnerSide
│   ├── dominantSide
│   ├── techCardAnnouncement          ← Technical Card Step 2（見 §4.1）
│   └── ivrAnnouncement?              ← IVR Step 2
├── stats/
│   ├── red/blue: pointsStat[5], gamjeom, gamjeomAvoiding, ivrRemaining?
│   ├── roundWins, roundScores
├── votes[]                           ← Multiple Mode 待確認投票
├── recentScores[]                    ← 大螢幕得分紀錄
├── providedCourtId?, providedDeviceId?
└── updatedAt
```

### 3.1 裁判席位（現行）

空位 = **節點不存在**（`null`），唔再用 `status: "vacant"`：

```json
"referees": {
  "J1": { "deviceId": "abc123xyz", "deviceName": "iPhone", "lastSeen": 1723276800000 },
  "J3": { "deviceId": "def456uvw", "deviceName": "Android", "lastSeen": 1723276805000 }
}
```

### 3.2 Match 計分相關欄位

**pointsStat 索引**（對應 Controller 按鈕）：

| Index | 分數 | 類型 |
|-------|------|------|
| 0 | +1 | Punch |
| 1 | +2 | Body |
| 2 | +3 | Head |
| 3 | +4 | Turning Body |
| 4 | +6 | Turning Head |

**總分公式**：

```
score = Σ(pointsStat[i] × [1,2,3,4,6]) + opponent.gamjeom + opponent.gamjeomAvoiding
```

**winReason**：`PUN`（Gam-jeom 上限）、`PTG`（分差）、`PTF`（局數勝出）

### 3.3 Technical Card（技術卡）公告欄位

Step 2 glass card 同步用；由主裁 Screen 寫入，所有訂閱同一 Match 嘅 Screen 讀取：

```json
"techCardAnnouncement": {
  "side": "blue",
  "decision": "accept",
  "startedAt": 1723276800000
}
```

| 欄位 | 說明 |
|------|------|
| `side` | `"blue"` \| `"red"` |
| `decision` | `"accept"` \| `"reject"` |
| `startedAt` | 公告開始時間（ms）；各 Screen 用於計算剩餘 3 秒 |

清除：`finalizeTechCardAnnouncement` 以 `runTransaction` 刪除節點；若 `decision === "reject"` 再呼叫 `updateScoreAndCheckRules(..., 'gamjeom', null, 1)`。多 Screen 同時 finalize 時只有首個 transaction 成功，避免重複加分。

---

## 4. 端到端運作流程 (End-to-End Flow)

### Phase A — 賽事建立

1. 管理員喺 Landing Google 登入 → 自動去 `/court-setup`
2. 建立 Event（可上傳 **HKTKDA PDF**，`pdfParser.js` 解析；多日自動拆子 Event）
3. 揀 Event + Court → 寫入 session → 進 Home

### Phase B — 載入比賽

1. Admin 去 `/import`（DataImport）
2. 新增或選擇 Match → **Load** 寫入 `courts/{eventId}/{courtId}/currentMatchId`  
   - 若該 Match 已係**其他** Court 嘅 `currentMatchId` → **拒絕**（`MATCH_BOUND_OTHER_COURT` toast）  
   - 同一 Court 重複 Load 同一場 → 允許  
   - **Unload**：`unloadMatchFromCourt` 將呢個 Court 嘅 `currentMatchId` 清成空字串（保留 `matchLive`／config）  
   - 原因：`matchLive/{event}/{matchId}` 共用，兩 Court 會交叉計分／計時
3. Screen 同 Controller 經 `onValue` 自動載入該 Match

### Phase C — 開波

1. Screen 全屏顯示；`Space` 開始／暫停計時
2. `Q` 開 QR Code Modal；裁判掃描進入 Controller
3. Controller 搶 J1→J2→J3；成功後註冊 `onDisconnect(seatRef).remove()`
4. 計時 **運行中**（`isPaused === false`）先可遙控得分

### Phase D — 計分同步

```
Controller.handleScore()
  → Api.updateScoreAndCheckRules(event, matchId, side, "pointsStat", index, 1, courtId, deviceId, seat, mode)
  → runTransaction(matchLive/{event}/{match})
  → Screen onValue(flat config + matchLive) 更新 UI + vote log
```

**Single Mode**：一次按鈕即加分。  
**Multiple Mode**：寫入 `votes`；2+ 不同 `deviceId` 在 **1 秒**內投同一 `side+index` 先真正加分，並寫入 `recentScores`。

### Phase D.1 — Technical Card（技術卡）公告同步

```
Edit.jsx（主裁）Accept/Reject
  → Api.startTechCardAnnouncement(event, matchId, { side, decision })
  → update matchLive/…/state.techCardAnnouncement { side, decision, startedAt }
  → 所有 Screen onValue(match view) 顯示 TechnicalCardAnnouncement（3 秒，startedAt 同步倒數）
  → 任一 Screen 倒數完 → Api.finalizeTechCardAnnouncement(event, matchId)
  → runTransaction(matchLive) 刪除 techCardAnnouncement
  → Reject：updateScoreAndCheckRules(..., 'gamjeom', null, 1)
```

* **Step 1**（確認 popup）只喺操作 Screen 嘅 Edit 底欄顯示，**唔寫** Firebase。
* **Step 2**（glass card）必須喺 Screen 層 `createPortal(document.body)`，確保觀眾可見。
* 詳細 UI spec → [`TODO_WT2026.md`](../TODO_WT2026.md#technical-card已實作)

### Phase E — 回合／晉級

1. 計時歸零或 PTG/PUN → `Edit` 宣告回合勝者（`declareRoundWinner`）
2. REST 階段倒數 → 自動 `startNextRound`
3. 贏夠局數 → **Promote Winner**（`promoteWinner`）寫入 `nextMatchId` 對應 slot

---

## 5. 模組對照 (Module Map)

| 檔案 | 職責 |
|------|------|
| `src/Api.js` | 計分 Transaction、回合、晉級；`VOTE_WINDOW_MS`；Technical Card 公告 API |
| `src/Pages/CourtSetup/CourtSetup.jsx` | Event/Court 建立、session 登入 |
| `src/Pages/DataImport/DataImport.jsx` | Match CRUD、Load to Court、Bracket |
| `src/Pages/Screen/Screen.jsx` | 大螢幕、計時、dominance、vote log |
| `src/Pages/Screen/Edit.jsx` | 主裁面板：手動改分、判勝、Kye-shi、Technical Card Step 1 |
| `src/Pages/Controller/Controller.jsx` | 搶位、遙控得分 |
| `src/Components/QRCodeDisplay/` | QR、裁判狀態、single/multiple 切換（`QRCodeDisplay.jsx` + Status／Mode panels） |
| `src/Components/TechnicalCardFlow/` | Technical Card Step 1 確認 + Step 2 公告 glass card |
| `src/Context/AuthContext.jsx` | Google Auth + Court session |
| `database.rules.json` | Firebase Security Rules |

---

## 6. 裁判搶位實作細節 (Controller.jsx)

1. 未登入用戶生成 `deviceId`，依次 `runTransaction` 試 `J1`、`J2`、`J3`
2. 若席位節點為 `null`，寫入 `{ deviceId, deviceName }`
3. 成功後 `onDisconnect(seatRef).remove()`
4. 監聽自己席位；若 `deviceId` 被取代則踢出
5. **Google 登入 Admin**：顯示 `Admin` 標籤，**不佔** Firebase 席位；計分靠 `auth != null` rules 路徑
6. React StrictMode：400ms delay 避免 double-mount 搶位競態

**滿額**：三席皆佔 → 顯示 "Court is Full"。

---

## 7. Firebase Security Rules (現行)

源碼：`database.rules.json`（**唔係**全開 `.write: true`）

| 路徑 | 寫入條件（摘要） |
|------|------------------|
| `events/{eventId}` | 已登入 + 為 `createdBy` 或 `coAdmins`；root write **唔可以**帶 `courts`／`matches` |
| `courts/.../referees/{slot}` | 已登入 **或** 同 `deviceId` 搶位／斷線（`null`）；寫入要有 `deviceId` |
| `matchLive/.../{matchId}` | 已登入 **或** 已有 live 節點且 Transaction 帶 `providedDeviceId` 匹配 flat J1/J2/J3 |
| `matches/.../config`、`matchIndex` | 已登入 owner／coAdmin（或 orphan 清理） |

Controller 計分時 `Api.js` 會暫寫 `providedCourtId`、`providedDeviceId` 供 rules 驗證。  
Screen `Edit` 面板不傳 deviceId，依賴 Admin 已登入 Google。

---

## 8. 大螢幕裁判狀態 UI (現況)

- **QR Modal / Edit 面板**：顯示 J1–J3 連線狀態同 `(n/3)`
- **主計分畫面**：**無**常駐 Referee Badge（〔計劃中〕可加）
- **斷線 Toast**：裁判離線時 Screen 彈出警告
- **Auto-downgrade**：連線裁判 < 2 時自動切回 `single` mode

---

## 9. 邊緣情況 (Edge Cases)

| 情況 | 現有行為 |
|------|----------|
| 3/3 滿額再掃碼 | Controller 顯示 Court is Full |
| 裁判斷線 | `onDisconnect` 清除席位；Screen Toast |
| 裁判 refresh 頁面 | **重新搶位**（無 token 恢復）〔計劃中改善〕 |
| 大螢幕關閉 | **無** hostStatus 警示〔計劃中〕 |
| 計時暫停 | Controller 禁畀分 |
| REST 階段 | `Api.js` 拒絕改分 |
| Multiple + 只有 1 裁判 | QR 面板 disable multiple；若已開會被 Screen 自動降級 |
| Technical Card flow 進行中 | Firebase 有 `techCardAnnouncement` 時禁止重複觸發；finalize 用 transaction 防雙重加分 |

---

## 10. 〔計劃中〕功能備忘

以下曾喺早期設計提及，**現有源碼未實作**：

1. **`localStorage` (`tkd_judge_session`)** — refresh 後恢復席位
2. **`hostStatus: online/offline`** — Screen heartbeat + Controller 警示
3. **大螢幕常駐 Referee Badge**
4. **IVR (Instant Video Replay)** — 見 [`TODO_WT2026.md`](../TODO_WT2026.md)

---

## 11. 相關常數

```javascript
// src/Api.js
export const VOTE_WINDOW_MS = 1000;  // Multiple Mode 有效得分投票窗口
```

---

*文件建立：2026-07-30*  
*最後更新：2026-08-11（Technical Card／技術卡 用語統一；Firebase 同步、schema §3.3）*  
*專案：TKD-scoreboard*
