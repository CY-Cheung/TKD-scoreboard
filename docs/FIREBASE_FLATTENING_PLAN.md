# Firebase RTDB Flattening Plan（扁平化計劃）

> **Status:** Stage 5+（flat config only；刪 nested `events/…/matches`）on `cursor/firebase-flat-config-only-8215`  
> Stage 1–2 已合入 `main`。Stage 3–5／seat／haptic 見 PR #10–#18。  
> **Stage 5+：** 新建／訂閱／寫 config 只認 flat `matches/…/config` + `matchLive`；`events/{id}` 只留 meta + settings。  
> Court Setup「清 courts／鬼位／legacy matches」會 backfill flat 後 **刪** 成個 `events/…/matches` 樹。

---

## 1. Why（點解）

Firebase Realtime Database：讀一個 node 會下載其下**所有** child。  
目標：列表輕、熱路徑細、用 ID 關聯；遷移可漸進、可回滾。

---

## 2. Current tree（而家）

```
events/{eventId}/                     ← meta + settings only（唔再寫 matches／courts）
eventIndex/{eventId}/
courts/{eventId}/{courtId}/           ← primary
matches/{eventId}/{matchId}/config/   ← primary config
matchIndex/{eventId}/{matchId}/
matchLive/{eventId}/{matchId}/        ← scoring / timer primary
```

過渡期：舊 DB 可能仍有 `events/…/matches`；開 Court Setup cleanup 可一次刪走。

---

## 3. Ideal flattened tree

```
eventIndex/{eventId}/
events/{eventId}/                     ← 只 meta + settings
courts/{eventId}/{courtId}/
matchIndex/{eventId}/{matchId}/
matches/{eventId}/{matchId}/config/
matchLive/{eventId}/{matchId}/
```

---

## 4. Migration stages

0. Backup  
1. `eventIndex`（main）  
2. Dual-write `courts`（main）  
3. Dual-write `matchLive`  
4. Dual-write `matches/config` + `matchIndex`  
5a. Orphan cleanup  
5b. Courts cutover（停寫 legacy courts）  
5c. Scoring TX → matchLive  
5. Delete nested courts + stop live reverse-mirror  
5+. **Flat config only：停寫／訂閱 legacy matches；cleanup 刪成個 nested matches 樹（本分支）**

---

## 5. Stage 5+ progress（本分支）

1. `eventPayloadForLegacyWrite` → 剝走 `courts` **同** `matches`  
2. `subscribeMatchView` → 只聽 flat config + `matchLive`  
3. `dualUpdateMatchConfigCompetitors`／`promoteWinner` → flat-only + `matchIndex`  
4. DataImport Add Match → 只 `mirrorMatchFlatArtifacts`  
5. Court Setup cleanup → `removeLegacyMatchesForEvent`（先 backfill flat，再 `remove(events/…/matches)`）  
6. Screen／Edit timer／config 讀 `matchData`／flat，唔再讀 legacy path  

**可選後續：** 收緊 `database.rules.json`（刪 nested matches write rules）；合入 `main`。

---

## 6. Rules

Production `database.rules.json` 仍保留部分 legacy nested write rules（過渡／cleanup）。  
終態草圖：`database.rules.flattened.skeleton.json`。
