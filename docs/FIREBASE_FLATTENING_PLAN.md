# Firebase RTDB Flattening Plan（扁平化計劃）

> **Status:** Flatten **complete** in production（export verified）  
> App API 已 flat-only rename；Court Setup flatten cleanup 已移除。  
> Stack：#19 Stage 5+ → #20 rules → #21 dead-code → 本分支 flat-api-cleanup。  
> Stage 1–2 已合入 `main`。其餘見 PR #10–#21。  
> **Rules：** 需 Firebase Console Publish（#20）。

---

## 1. Why（點解）

Firebase Realtime Database：讀一個 node 會下載其下**所有** child。  
目標：列表輕、熱路徑細、用 ID 關聯。

---

## 2. Production tree（而家）

```
eventIndex/{eventId}/
events/{eventId}/                     ← meta + settings only
courts/{eventId}/{courtId}/
matches/{eventId}/{matchId}/config/
matchIndex/{eventId}/{matchId}/
matchLive/{eventId}/{matchId}/
```

---

## 3. Migration stages（完成）

0–2：`eventIndex` + courts dual-write（main）  
3–5c：matchLive／matches／cutover／TX  
5 / 5+：刪 nested courts／matches；flat config only  
Rules tighten + dead-code + flat API rename（本 stack）

---

## 4. Flat API names

| 舊名 | 新名 |
|------|------|
| `dualSetCourtField` | `setCourtField` |
| `dualUpdateCourtField` | `updateCourtField` |
| `subscribePreferFlatCourt` | `subscribeCourt` |
| `getPreferFlatCourt` | `getCourt` |
| `dualUpdateMatchState` | `updateMatchLiveState` |
| `dualUpdateMatchStatsSide` | `updateMatchLiveStatsSide` |
| `dualUpdateMatchConfigCompetitors` | `updateMatchConfigCompetitors` |
| `eventPayloadForLegacyWrite` | `eventMetaPayloadForWrite` |

---

## 5. Rules

見 `database.rules.json`：無 nested courts／matches write；`events` validate 禁 nested；`matchLive` 只認 flat seats。  
Publish：Firebase Console → Rules，或 `firebase deploy --only database`。

---

## 6. Removed cleanup UI

Court Setup「清 courts／鬼位／legacy matches」已刪（production 已乾淨）。  
仍保留：**Clean Orphan Data**（orphan trees）。
