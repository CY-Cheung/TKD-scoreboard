# Firebase RTDB Flattening Plan（扁平化計劃）

> **Status:** Stage 5+ flat tree verified in production；rules tighten on `cursor/firebase-rules-tighten-8215`  
> Stage 1–2 已合入 `main`。Stage 3–5+／seat／haptic 見 PR #10–#19。  
> **App：** 新建／訂閱／寫 config 只認 flat `matches/…/config` + `matchLive`；`events/{id}` 只留 meta + settings。  
> **Rules：** 已移除 nested courts／matches write；`events` validate 禁止寫入 nested trees；`matchLive` 只認 flat seats。

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

**可選後續：** 合入 `main`（Stage 3–5+／rules／dead-code PR stack）。

---

## 6. Rules（Stage 5+ tightened）

Production `database.rules.json`（同 `database.rules.flattened.skeleton.json`）已：

1. **刪** nested `events/…/courts`／`events/…/matches` 專用 write rules（唔再畀 unauth 寫 legacy）  
2. `events/{id}` `.validate`：**禁止** root write 帶 `courts`／`matches`  
3. `matchLive` unauth 路徑：只認 **flat** `courts/…/referees`；要 `data.exists()`（唔畀裁判憑空 create）  
4. Flat `courts/…/referees` 仍要求 `deviceId` `.validate`

Publish：Firebase Console → Realtime Database → Rules，或 `firebase deploy --only database`。

---

## 7. Dead-code cleanup

已刪／簡化（`cursor/firebase-legacy-deadcode-8215`）：

- `runLegacyMatchTransaction`、`mirrorLiveFieldsToLegacy`、legacy matchLive bootstrap／backfill／strip-live-fields  
- `fetchMatchConfigForRules`／`fetchMatchesForEvent`／Screen ensure → **flat-only**  
- `legacyMatchConfigOnlyPayload`、`mergeMatchView`、strip-live patch helpers  
- DataImport 刪場次只清 flat artifacts  
- `eventMetaPayloadForWrite`（取代 legacy write helper 名）

**仍保留（cleanup only）：** `removeLegacyMatchesForEvent`、`backfillMatchFlatFromLegacyEvent`、`removeLegacyCourtsForEvent`／`ensureFlatCourtsAndStripLegacy`。
