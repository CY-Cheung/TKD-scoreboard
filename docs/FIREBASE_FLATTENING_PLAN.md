# Firebase RTDB Flattening Plan（扁平化計劃）

> **Status:** Stage 5c（matchLive scoring TX）in progress on `cursor/firebase-stage5c-matchlive-tx-8215`  
> Stage 1–2 已合入 `main`。Stage 3–5b／seat／haptic 見相關 PR（#10–#16）。  
> **Stage 5c：** 計分／round／finalize TX 改跑 `matchLive/{e}/{m}`（primary）；config rules 由 flat／legacy config 注入；live fields reverse-mirror 返 legacy。  
> **部署提醒：** Publish `database.rules.json`（含 `matchLive` unauth seat write）。

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
└── matches/{matchId}/         ← Stage 5c：live fields reverse-mirror；config 仍可存在

courts/{eventId}/{courtId}/           ← Stage 5b primary
matches/{eventId}/{matchId}/config/   ← Stage 4
matchIndex/{eventId}/{matchId}/       ← Stage 4
matchLive/{eventId}/{matchId}/        ← Stage 5c scoring TX primary
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
5a. Orphan cleanup  
5b. Courts cutover（停寫 legacy courts）  
5c. **Scoring TX → matchLive（本分支）**  
5. Delete old nested paths（未做；仍未刪 production nested courts／legacy match live）

App 內 backfill：`backfillMatchFlatFromLegacyEvent`／`ensureMatchLiveExists`。

刪 Event → 清 `eventIndex`／`courts`／`matches`／`matchLive`／`matchIndex` + `events`（防 orphan）。

---

## 6. Stage 5c progress（本分支）

1. `runMatchLiveTransaction` — TX on `matchLive/{e}/{m}`  
2. Prefetch `matches/…/config`（fallback legacy）注入 working view（唔寫入 live）  
3. Api：`updateScoreAndCheckRules`／`declareRoundWinner`／`startNextRound`／`finalizeTechCard*`／`finalizeIvr*` → live TX  
4. `dualUpdateMatchState`／`dualUpdateMatchStatsSide` → live primary + legacy reverse-mirror  
5. Commit 後 `mirrorLiveFieldsToLegacy`（過渡期，subscribe 仍可聽 legacy base）  
6. **未**刪 `events/…/matches` live fields（觀察期後再做）

**記得 Publish** `database.rules.json`（`matchLive`）。

---

## 7. Rules skeleton

見 **`database.rules.flattened.skeleton.json`**（理想終態草圖）。  
Cutover 期間以 production `database.rules.json` 為準。

---

## 8. Out of scope

- Firestore  
- 一次過 breaking 切正式站  
- 自動 migration GitHub Action（可後補）
