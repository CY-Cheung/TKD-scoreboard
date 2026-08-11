# Firebase RTDB Flattening Plan（扁平化計劃）

> **Status:** Stage 5b（courts cutover）in progress on `cursor/firebase-courts-cutover-8215`  
> Stage 1–2 已合入 `main`（`eventIndex` + dual-write `courts`）。  
> Stage 3（`matchLive` dual-write）／Stage 4（`matches` + `matchIndex`）／Stage 5a（orphan cleanup）見相關 PR。  
> **Stage 5b：** 停止 dual-write legacy `events/…/courts`；flat `courts/{e}/{c}` 係 write + seat claim 主路徑；讀仍可 fallback legacy。  
> **部署提醒：** Publish 更新後嘅 `database.rules.json`（referees heartbeat：同一 `deviceId` 可 update）。

---

## 1. Why（點解）

Firebase Realtime Database：讀一個 node 會下載其下**所有** child。  
現行 `events/{eventId}` 把 courts、matches、stats、votes 包埋一齊 →  
Court Setup／Import 用 `get('events')` 時容易 **Over-fetching（過度獲取）**。

**目標：** 列表輕、熱路徑細、用 ID 關聯；遷移可漸進、可回滾。

---

## 2. Current tree（而家）

```
events/{eventId}/
├── EventName, createdBy, createdByEmail, coAdmins?
├── settings/…
├── courts/{courtId}/          ← Stage 5b：app 唔再寫；讀仍可 fallback
└── matches/{matchId}/         ← 仍 dual-write；flat config／live／index 已鏡像

courts/{eventId}/{courtId}/    ← Stage 5b：primary writes + seat claim
```

---

## 3. Ideal flattened tree（最理想）

```
eventIndex/{eventId}/                 ← 列表用（極輕）
events/{eventId}/                     ← 只 meta + settings
courts/{eventId}/{courtId}/           ← 場地運行時
matchIndex/{eventId}/{matchId}/       ← 對陣表摘要
matches/{eventId}/{matchId}/config/   ← 比賽靜態
matchLive/{eventId}/{matchId}/        ← state / stats / votes / recentScores
```

---

## 4. Path mapping（而家 → 理想）

| 資料 | 而家 | 理想 |
|------|------|------|
| 賽事列表摘要 | `events`（整樹） | `eventIndex/{eventId}` |
| Court | `events/{e}/courts/{c}` | `courts/{e}/{c}` |
| 比賽設定 | `events/{e}/matches/{m}/config` | `matches/{e}/{m}/config` |
| 對陣摘要 | 讀成個 `matches` | `matchIndex/{e}/{m}` |
| 即時計分 | `events/{e}/matches/{m}` live | `matchLive/{e}/{m}/…` |

---

## 5. Migration stages

0. Backup  
1. `eventIndex`（已合入 main）  
2. Dual-write `courts`（已合入 main）  
3. Dual-write `matchLive`  
4. Dual-write `matches/config` + `matchIndex` + backfill  
5a. Orphan cleanup（Court Setup → Clean Orphan Data）  
5b. **Courts cutover（本分支）** — 停寫 legacy courts；flat primary；建立 event 時 `eventPayloadWithoutCourts`  
5c. （可選）scoring TX 搬離 legacy matches  
5. Delete old nested paths（未做；5b **唔**刪 production nested courts）

App 內 backfill：`backfillMatchFlatFromLegacyEvent`（Data Import 開 match 列表時 `fetchMatchesForEvent` 會 best-effort 觸發）。

刪 Event → 清 `eventIndex`／`courts`／`matches`／`matchLive`／`matchIndex` + `events`（防 orphan）。

**Stage 5a（orphan cleanup）：** Court Setup → **Clean Orphan Data** — 掃描頂層 `courts`／`matches`／`matchIndex`／`matchLive` 入面、唔喺 `eventIndex∪events` 嘅 eventId，確認後刪除。

---

## 6. Stage 5b progress（本分支）

1. `dualSetCourtField` / `dualUpdateCourtField` → **flat-only** writes（保留舊函數名）  
2. Controller seat claim／heartbeat／onDisconnect／kick → **flat** `courts/…/referees`  
3. 建立 Event（Court Setup／Data Import）→ `eventPayloadWithoutCourts` + `mirrorCourtsMapToFlat`  
4. Screen stale janitor → `clearRefereeSeat`（flat + best-effort legacy）  
5. Rules：unauth 可用同一 `deviceId` update seat（heartbeat）  
6. **未**刪 `events/…/courts` 舊資料（觀察期後再做）

**Cutover 注意：** Deploy 後請裁判重新掃 QR／搶座；舊 legacy-only seat 會逐步被清走。  
**記得 Publish** `database.rules.json`。

---

## 7. Rules skeleton

見 **`database.rules.flattened.skeleton.json`**（理想終態草圖）。  
Cutover 期間以 production `database.rules.json` 為準（保留 legacy nested rules 作讀 fallback）。

---

## 8. Out of scope

- Firestore  
- 一次過 breaking 切正式站  
- 自動 migration GitHub Action（可後補）
