# Firebase RTDB Flattening Plan（扁平化計劃）

> **Status:** Stage 4 **in progress** on branch `cursor/firebase-stage4-matches-8215`  
> Stage 1–2 已合入 `main`（`eventIndex` + dual-write `courts`）。  
> Stage 3（`matchLive` dual-write）喺 `cursor/firebase-matchlive-dual-write-8215`／PR #10。  
> Stage 4：dual-write 頂層 `matches/{e}/{m}/config` + `matchIndex/{e}/{m}`；列表 prefer flat；刪 Event／Match 清齊 orphan 頂層樹。  
> **部署提醒：** Publish 含 `matchLive`／`matches`／`matchIndex` 嘅 `database.rules.json`。

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
├── courts/{courtId}/          ← 仍 dual-write；flat 喺 /courts
└── matches/{matchId}/         ← 仍 dual-write；flat config／live／index 已鏡像
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
3. Dual-write `matchLive`（PR #10）  
4. Dual-write `matches/config` + `matchIndex` + backfill（**本分支**）  
5. Delete old nested paths（未做）

App 內 backfill：`backfillMatchFlatFromLegacyEvent`（Data Import 開 match 列表時 `fetchMatchesForEvent` 會 best-effort 觸發）。

刪 Event → 清 `eventIndex`／`courts`／`matches`／`matchLive`／`matchIndex` + `events`（防 orphan）。

---

## 6. Stage 4 progress（本分支）

1. 建立／匯入／改 Match → `mirrorMatchFlatArtifacts`（config + index + live）  
2. Data Import 列表：`fetchMatchesForEvent` prefer flat，否則 legacy + backfill  
3. `promoteWinner` dual-write flat config competitors + refresh index  
4. 刪 Match／Event → `removeMatchFlatArtifacts(ForEvent)`  
5. Rules：`matches` + `matchIndex`  
6. Scoring TX 仍喺 legacy（需要成個 match）；**未**刪 `events/…/matches`

**記得 Publish** `database.rules.json`。

---

## 7. Rules skeleton

見 **`database.rules.flattened.skeleton.json`**（理想終態草圖）。  
Dual-write 期間以 production `database.rules.json` 為準（保留 legacy nested rules）。

---

## 8. Out of scope

- Firestore  
- 一次過 breaking 切正式站  
- 自動 migration GitHub Action（可後補）
