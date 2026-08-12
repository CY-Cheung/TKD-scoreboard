# API Documentation（介面文件）

**Product:** Taekwondo Cloud Scoring System  
**Document status:** Reverse-engineered from source  
**Last reviewed against code:** 2026-08-10

> **Codebase baseline:** `main` @ 分析當日。Google Auth 同 Event／Court session 現時同喺 `AuthContext`。計分邏輯主要喺 `src/Api.js`（尚未拆 `src/domain/`）。**未有** `npm test`／Vitest。平行 refactor 分支可能另有結構 — 唔當作已合入 `main`。  
> **用語：** Technical Card 中文一律「技術卡」；雙語標籤用 `English（中文）`。

---

## 0. Important finding（重要結論）

本 Repository **沒有** 自建 HTTP REST／GraphQL server，亦 **未見** Firebase Cloud Functions。

因此：

| 傳統「API」概念 | 本專案對應物 |
|-----------------|--------------|
| HTTP Routing + Controller | **React Router** 客戶端路由（§1） |
| Backend Endpoint | **`src/Api.js` Firebase facade** + 直接 `firebase/database` 呼叫（§2–§3） |
| Auth Endpoint | **Firebase Auth** Google popup（§4） |
| OpenAPI／Swagger | **不適用** |

以下用「Client Route」同「Firebase Data API」描述實際介面。凡未能由程式證實嘅外部 HTTP 合約，標 **`[待確認]`**，**唔會捏造** REST path。

---

## 1. Client routing（SPA 路由）

**Basename:** `/TKD-scoreboard`  
**Host example:** `https://cy-cheung.github.io/TKD-scoreboard/`

SPA 路由由瀏覽器 `history` 處理；server 只提供靜態檔（GitHub Pages + `404.html` fallback）。  
**HTTP Method：** 實質上係瀏覽器對靜態資源嘅 `GET`；應用路徑 **唔係** 後端 REST resource。

| Client path | UI「Controller」 | Access | Query／Params | UI Response（畫面） |
|-------------|------------------|--------|---------------|---------------------|
| `/` | `Landing` | Public | — | 產品介紹；Google CTA；已登入 → 導向 `/court-setup` |
| `/court-setup` | `CourtSetup` | Google user（頁內閘） | — | Event 列表／建立／揀 Court；成功 → session + `/home` |
| `/home` | `Home` | Event+Court session | — | 導航、場地資訊、QR |
| `/screen` | `Screen`（含 `Edit`） | Session | — | 大螢幕計分／計時／公告 |
| `/controller` | `Controller` | Session **或** URL params | `event`, `court`（search 或 hash query） | 搶席／得分板；滿席顯示 Court is Full |
| `/import` | `DataImport` | Session | — | Manage Match／Rules／Load／Bracket |
| `*` | `Navigate` → `/` | — | — | Redirect |

### 1.1 Controller deep-link parameters

| Parameter | Required | Source priority（Controller 參數解析邏輯；檔案位置以 repo 為準） | Meaning |
|-----------|----------|------------------------------------------|---------|
| `event` | Yes（實務） | React Router search → `window.location.search` → hash `?...` → Auth session／`sessionStorage.selectedEvent` | Event id |
| `court` | Yes（實務） | 同上（court keys） | Court id，如 `court1` |

**Example URL**

```text
https://cy-cheung.github.io/TKD-scoreboard/controller?event=<eventId>&court=court1
```

**Response format:** HTML SPA shell + React render；**無** JSON body。

---

## 2. Application facade — `src/Api.js`

呢啲係 **JavaScript function API**（畀 React 頁面呼叫），唔係 HTTP。  
除非另有說明，成功路徑多數 **無 return value**（fire-and-forget `runTransaction`／`update`）；錯誤見 `.catch`／`throw`。

### 2.1 Scoring & rounds

#### `updateScoreAndCheckRules`

| Field | Value |
|-------|--------|
| **Kind** | Firebase `runTransaction` on `matchLive/{eventName}/{matchId}` |
| **Parameters** | `eventName`, `matchId`, `side` (`red`\|`blue`), `type` (`pointsStat`\|`gamjeom`\|`gamjeomAvoiding`), `index` (pointsStat 0–4 或 gamjeom 時可 `null`), `delta` (number), `courtId?`, `deviceId?`, `seatName?`, `mode` (`single`\|`multiple`, default `single`) |
| **Side effects** | 更新 `stats`、可能更新 `votes`／`recentScores`、`state.winReason`／`dominantSide`／timer pause（PUN／PTG）；REST phase 時 abort |
| **Return** | `undefined`（promise 未暴露畀 caller；內部 `.catch` log） |
| **Errors** | Console `"Transaction failed:"` |

#### `declareRoundWinner`

| Field | Value |
|-------|--------|
| **Kind** | `runTransaction` |
| **Parameters** | `eventName`, `matchId`, `winnerSide` (`red`\|`blue`) |
| **Side effects** | 寫 `roundScores`、加 `roundWins`；未完場 → REST + reset side stats；達 `roundsToWin` → `winReason=PTF`, `isFinished=true` |
| **Return** | `undefined` |

#### `startNextRound`

| Field | Value |
|-------|--------|
| **Kind** | `runTransaction` |
| **Parameters** | `eventName`, `matchId` |
| **Side effects** | `currentRound++`、phase `ROUND`、timer=`roundDuration`、paused |
| **Return** | `undefined` |

#### `promoteWinner`

| Field | Value |
|-------|--------|
| **Kind** | `get` + `update` |
| **Parameters** | `eventName`, `currentMatchId`, `winnerSide` |
| **Success return** | `string` message，例如晉級成功中文說明 |
| **Failure** | `throw Error`（缺 config／缺 `nextMatchId`／`nextMatchSlot` 等） |
| **Side effects** | 寫下一場 `competitors.{slot}`；寫 `state.winnerSide` |

### 2.2 Technical Card（技術卡）

#### `startTechCardAnnouncement`

| Field | Value |
|-------|--------|
| **Kind** | `update` on `.../state` |
| **Parameters** | `eventName`, `matchId`, `{ side, decision }` (`accept`\|`reject`) |
| **Writes** | `state.techCardAnnouncement = { side, decision, startedAt: Date.now() }` |
| **Return** | Firebase `update` Promise |

#### `finalizeTechCardAnnouncement`

| Field | Value |
|-------|--------|
| **Kind** | `runTransaction` + optional score update |
| **Parameters** | `eventName`, `matchId` |
| **Behaviour** | 刪除 `techCardAnnouncement`；若 `decision==="reject"` → `updateScoreAndCheckRules(..., 'gamjeom', null, 1)` |
| **Return** | `undefined`（早退時亦然） |

### 2.3 Kye-shi

#### `startKyeShi`

| Field | Value |
|-------|--------|
| **Parameters** | `eventName`, `matchId`, `durationSeconds=60` |
| **Writes** | `state.kyeShi = { startedAt, duration }` |
| **Return** | `update` Promise |

#### `stopKyeShi`

| Field | Value |
|-------|--------|
| **Parameters** | `eventName`, `matchId` |
| **Writes** | `state.kyeShi = null` |
| **Return** | `update` Promise |

### 2.4 IVR helpers & announcements

Pure／local helpers（**無**网络 I/O）：

| Function | Parameters | Return |
|----------|------------|--------|
| `isIvrUnlimited(value)` | quota value | `boolean` |
| `parseIvrQuotaInput(value)` | input string／empty | `number\|null` |
| `formatIvrQuotaForInput(value)` | stored quota | `string` |
| `appendIvrQuotaToSettings(settings, ivrQuotaInput)` | object + input | mutated `settings` |
| `appendIvrQuotaToRules(rules, ivrQuotaInput)` | object + input | mutated `rules` |
| `buildIvrQuotaUpdate(ivrQuotaInput)` | input | `{ ivrQuota: number\|null }` |
| `isIvrWtMode(eventSettings, matchRules)` | settings | `boolean` |
| `resolveIvrQuotaCap(eventSettings, matchRules)` | settings | number or `IVR_UNLIMITED` (-1) |
| `getEffectiveIvrRemaining(stats, side, eventSettings, matchRules)` | stats… | number |
| `formatIvrQuotaForEdit(remaining)` | remaining | `string` |
| `projectIvrRemaining(current, decision)` | current, `accept`\|`reject` | next remaining |

Firebase-backed：

#### `setIvrRemaining`

| Field | Value |
|-------|--------|
| **Parameters** | `eventName`, `matchId`, `side`, `value` |
| **Writes** | `stats/{side}/ivrRemaining`（empty → `IVR_UNLIMITED`） |
| **Return** | `update` Promise |

#### `startIvrAnnouncement`

| Field | Value |
|-------|--------|
| **Parameters** | `eventName`, `matchId`, `{ side, decision }` |
| **Writes** | `state.ivrAnnouncement = { side, decision, startedAt }` |
| **Return** | `update` Promise |

#### `finalizeIvrAnnouncement`

| Field | Value |
|-------|--------|
| **Parameters** | `eventName`, `matchId`, `eventSettings={}` |
| **Side effects** | 刪公告；`projectIvrRemaining` 寫入 `ivrRemaining` |
| **Return** | `Promise`（transaction） |

### 2.5 Other exports from `Api.js`

- `VOTE_WINDOW_MS`
- `IVR_UNLIMITED` 同 IVR helper 函數（見 §2.4）
- `getScoreValue`／`resetSideStatsForNextRound` 喺 **`main` 為 Api 內部函式**（未必 export）→ 以檔案實際 `export` 為準

---

## 3. Firebase Realtime Database path API（資料平面）

呢度唔係 HTTP，但係系統真正嘅「遠端介面」。客戶端使用 Firebase SDK：

| SDK op | 類比 HTTP | 用途 |
|--------|-----------|------|
| `get` | GET once | 讀 config（如 promote） |
| `onValue` | GET + push subscribe | Screen／Controller 即時訂閱 |
| `update` | PATCH | 局部欄位 |
| `set` | PUT | 建立 event／match 文件（頁面／services） |
| `runTransaction` | 條件式 read-modify-write | 計分、搶席、finalize |
| `onDisconnect().remove()` | — | 席位斷線清理 |

### 3.1 Canonical paths

| Path | Typical ops | Payload shape（節錄） |
|------|-------------|----------------------|
| `eventIndex/{eventId}` | `set`／`update`／`remove` | `EventName`, `createdBy`, … |
| `events/{eventId}` | `set`／`update`／`remove` | meta + `settings` only（無 nested courts／matches） |
| `courts/{eventId}/{courtId}/currentMatchId` | `update`／`set` | string match id |
| `courts/{eventId}/{courtId}/config/refereeMode` | `update` | `"single"` \| `"multiple"` |
| `courts/{eventId}/{courtId}/referees/{J1\|J2\|J3}` | transaction／`onDisconnect` | `{ deviceId, deviceName, lastSeen }` 或 `null` |
| `matches/{eventId}/{matchId}/config` | `set`／`update`／`get` | static match config |
| `matchIndex/{eventId}/{matchId}` | `set`／`remove` | bracket／list summary |
| `matchLive/{eventId}/{matchId}` | transaction／`update` | live state／stats／votes／recentScores |
| `matchLive/{eventId}/{matchId}/state` | `update` | timer／announcements／kyeShi |
| `matchLive/{eventId}/{matchId}/stats/{side}` | `update` | `ivrRemaining` 等 |
| `.info/serverTimeOffset` | `onValue` | number ms |

### 3.2 Match transaction write shape（計分）

Multiple／judge 路徑會喺 transaction 內寫入：

```json
{
  "providedCourtId": "court1",
  "providedDeviceId": "<deviceId>",
  "stats": { "red": { "pointsStat": [0,0,0,0,0], "gamjeom": 0 }, "blue": {} },
  "votes": [{ "side": "red", "index": 1, "seatName": "J1", "deviceId": "…", "timestamp": 0 }],
  "recentScores": [{ "side": "red", "index": 1, "seatNames": ["J1","J2"], "timestamp": 0 }],
  "state": { "winReason": "PTG", "dominantSide": "red", "isPaused": true }
}
```

實際欄位視 `type`／mode／PUN／PTG 而定。

### 3.3 Authorization（Rules 層「回應」）

Firebase 拒絕非法寫入時，SDK Promise **reject**（permission denied）。  
客戶端 UI 對每種錯誤嘅提示文案 → 部分有 toast；覆蓋率 **`[待確認]`**（未逐頁核對所有 catch）。

---

## 4. Authentication API（Firebase Auth）

| Operation | SDK | Parameters | Result |
|-----------|-----|------------|--------|
| Sign in | `signInWithPopup(auth, GoogleAuthProvider)` | — | `User` credential |
| Sign out | `signOut(auth)` | — | clears Google session |
| Persistence | `browserSessionPersistence` | — | tab／session scoped |
| Extra | `AUTH_SESSION_KEY` in `sessionStorage` | workaround flag | 見 `AuthContext` |

**HTTP details of Google OAuth** 由 Firebase／Google 托管；本 repo **無**自訂 OAuth redirect endpoint 實作。

---

## 5. Non-API side channels

| Channel | Purpose |
|---------|---------|
| `sessionStorage` | `selectedEvent`, `selectedCourt`, `selectedEventName`, Google auth workaround key |
| QR payload | URL string to `/controller?event=&court=` |
| Keyboard shortcuts on Screen | `Space`／`E`／`Q`／`K`／`\` — 本地 UI，非網絡 API |

---

## 6. What is intentionally not documented as HTTP

- **無** `GET /api/matches` 一類 REST resource。  
- **無** 統一 JSON error envelope（`{ code, message }`）。  
- **無** 版本化 API（`/v1`）。  

若未來加 Cloud Functions／BFF，應另開 OpenAPI；**目前不適用**。

---

## 7. Document history

| Date | Change |
|------|--------|
| 2026-08-10 | Initial API doc: SPA routes + Api.js + RTDB paths; no REST invented |
