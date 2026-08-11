# Firebase RTDB Flattening Plan（扁平化計劃）

> **Status:** Stage 5（delete nested courts + matchLive write-only）on `cursor/firebase-stage5-delete-nested-8215`  
> Stage 1–2 已合入 `main`。Stage 3–5c／seat／haptic 見 PR #10–#17。  
> **Stage 5：** 停 matchLive→legacy reverse-mirror；court 讀寫只認 flat；開 Court Setup 時 backfill + **刪** `events/…/courts`。  
> Legacy `events/…/matches` **config** 仍可保留（Stage 4 dual）；live fields 以 `matchLive` 為準，唔再寫返 legacy。

---

## 1. Why（點解）

Firebase Realtime Database：讀一個 node 會下載其下**所有** child。  
目標：列表輕、熱路徑細、用 ID 關聯；遷移可漸進、可回滾。

---

## 2. Current tree（而家）

```
events/{eventId}/
├── EventName, createdBy, settings/…
├── courts/     ← Stage 5：刪除（開 Setup 會 strip）
└── matches/    ← config 可能仍在；live 唔再 reverse-mirror

courts/{eventId}/{courtId}/           ← primary
matches/{eventId}/{matchId}/config/   ← Stage 4
matchIndex/{eventId}/{matchId}/
matchLive/{eventId}/{matchId}/        ← scoring / timer primary
```

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
5. **Delete nested courts + stop live reverse-mirror（本分支）**  
5+. （可選）刪 legacy `events/…/matches` 內 live fields／成個 matches 節點，只留／遷 config

---

## 5. Stage 5 progress（本分支）

1. `runMatchLiveTransaction`／`dualUpdateMatchState`／stats → **唔再** `mirrorLiveFieldsToLegacy`  
2. `ensureFlatCourtsAndStripLegacy` — backfill flat 後 `remove(events/…/courts)`  
3. `fetchCourtIds`／Court Setup 選 event 會觸發 strip  
4. `subscribePreferFlatCourt`／`subscribeCourtReferees`／`getPreferFlatCourt` → **flat-only**  
5. 建立 event 後 `removeLegacyCourtsForEvent`  

**未做：** 刪 production 入面 legacy match 嘅 `state/stats/votes` 舊資料（可手動或後續工具）。

---

## 6. Rules

Production `database.rules.json` 仍保留 legacy nested write rules（過渡）。  
終態草圖：`database.rules.flattened.skeleton.json`。
