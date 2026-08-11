# Firebase RTDB Flattening Plan（扁平化計劃）

> **Status:** Stage 3 **in progress** on branch `cursor/firebase-matchlive-dual-write-8215`  
> Stage 1–2 已合入 `main`（`eventIndex` + dual-write `courts`）。  
> Stage 3：計分 TX 仍喺 legacy `events/…/matches`（需要 config），成功後 mirror 去 `matchLive/`；state／stats 雙寫；UI prefer `matchLive` + legacy `config`。  
> **部署提醒：** Publish 含 `matchLive` 嘅 `database.rules.json`。

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
├── courts/{courtId}/
│   ├── name, currentMatchId
│   ├── config/refereeMode
│   └── referees/J1|J2|J3
└── matches/{matchId}/
    ├── config/…
    ├── state/…
    ├── stats/…
    ├── votes[]?, recentScores[]?
    └── providedCourtId?, providedDeviceId?
```

---

## 3. Ideal flattened tree（最理想）

```
eventIndex/{eventId}/                 ← 列表用（極輕）
events/{eventId}/                     ← 只 meta + settings
courts/{eventId}/{courtId}/           ← 場地運行時
matchIndex/{eventId}/{matchId}/       ← 對陣表摘要（可選）
matches/{eventId}/{matchId}/config/   ← 比賽靜態
matchLive/{eventId}/{matchId}/        ← state / stats / votes / recentScores
```

---

## 4. Path mapping（而家 → 理想）

### 4.1 Entity map

| 資料 | 而家 | 理想 |
|------|------|------|
| 賽事列表摘要 | `events`（整樹） | `eventIndex/{eventId}` |
| 賽事設定／名 | `events/{e}` | `events/{e}`（只 meta＋settings） |
| Court | `events/{e}/courts/{c}` | `courts/{e}/{c}` |
| 裁判席 | `events/{e}/courts/{c}/referees` | `courts/{e}/{c}/referees` |
| 比賽設定 | `events/{e}/matches/{m}/config` | `matches/{e}/{m}/config` |
| 對陣摘要 | 讀成個 `matches` | `matchIndex/{e}/{m}` |
| 即時計分 | `events/{e}/matches/{m}` 下 live 欄位 | `matchLive/{e}/{m}/…` |
| Server offset | `.info/serverTimeOffset` | 不變 |

### 4.2 By screen

#### Court Setup
| 操作 | 而家 | 理想 |
|------|------|------|
| 列出賽事 | R `events` | R `eventIndex` |
| 列 courts | R `events/{e}/courts` | R `courts/{e}` |
| 建立 Event | W `events/{e}`（含 courts） | W `events` + `eventIndex` + `courts/{e}/…` |
| 刪 Event | remove `events/{e}` | 清齊 index／events／courts／matches／matchLive／matchIndex |
| setupPassword | R `events/{e}/settings/…` | 同左（收窄到 settings） |

#### Home
| 操作 | 而家 | 理想 |
|------|------|------|
| 賽事顯示 | R `events/{e}`（易過大） | R meta 或 `eventIndex/{e}` |

#### Data Import
| 操作 | 而家 | 理想 |
|------|------|------|
| 賽事列表 | R `events` | R `eventIndex` |
| Match 列表 | R `events/{e}/matches` | R `matchIndex/{e}` 或只 config |
| 新增／改 Match | W `events/{e}/matches/{m}` | W `matches/…/config` + `matchIndex`（+ init `matchLive`） |
| Load 到 Court | W `…/courts/{c}/currentMatchId` | W `courts/{e}/{c}/currentMatchId` |

#### Screen / Controller / Edit / Api
| 操作 | 而家 | 理想 |
|------|------|------|
| EventName | R `events/{e}` | R `EventName` 細 path 或 index |
| refereeMode／席位／currentMatchId | R/W `events/…/courts/…` | R/W `courts/{e}/{c}/…` |
| 比賽＋計分 | R/W `events/…/matches/{m}` | config → `matches/…`；live → `matchLive/…` |
| 加分／IVR／TC tx（Api.js） | `events/…/matches/{m}` | 多數改 `matchLive/{e}/{m}` |

#### QR / mode 切換
| 操作 | 而家 | 理想 |
|------|------|------|
| mode、清席 | W `events/…/courts/…` | W `courts/{e}/{c}/…` |

---

## 5. Migration（舊資料點搬）

### 5.1 Strategies

| 策略 | 做法 | 何時用 |
|------|------|--------|
| 只修讀 + `eventIndex` | 列表改讀 index；matches 暫留原位 | **最先做（Stage 1）** |
| Dual-write | 新碼寫舊+新；讀優先新、fallback 舊 | courts／matchLive 搬家 |
| 一次 script | 掃舊樹寫新樹 → 切碼 → 觀察 → 刪舊 | 歷史資料／收尾 |

### 5.2 Stages

0. **Backup** — Console export 或 script dump `events`。  
1. **`eventIndex`** — 補寫摘要；列表改讀；create／delete／rename 同步。  
2. **Dual-write `courts`** — 席位／`currentMatchId`／mode 雙寫；讀切新 path。  
3. **Dual-write `matchLive`** — live 欄位雙寫或 flag 一次切（tx 最敏感）。  
4. **Batch migrate history** — 掃全部 matches → `matches`／`matchLive`／`matchIndex`。  
5. **Delete old paths** — 確認無 client 再用後先 `remove` 舊子樹。

### 5.3 Script sketch

```text
for each eventId under /events:
  write /eventIndex/{eventId} from EventName, createdBy, …
  for each courtId: copy → /courts/{eventId}/{courtId}
  for each matchId:
    config → /matches/{eventId}/{matchId}/config
    live  → /matchLive/{eventId}/{matchId}/…
    summary → /matchIndex/{eventId}/{matchId}
# 切 app + rules 後先唔刪舊；觀察期再刪
```

Prefer Admin SDK 或維護窗腳本。

### 5.4 Consistency

- 改 **EventName** → 同步 `eventIndex` + `events`。  
- 刪 Event → 刪齊所有頂層分支。  
- Load Match → 只改 `courts/…/currentMatchId`。  
- 進行中比賽 → 唔好半搬 live；用 feature flag。

### 5.5 Rollback

保留舊樹；feature flag 切返舊讀寫；rules 同 app 同一變更集。

---

## 6. Stage progress

**Stage 1（已合入 main）：** `eventIndex` + 收窄 EventName／settings 讀取。

**Stage 2（已合入 main）：** dual-write `courts`。

**Stage 3（本分支）：dual-write `matchLive`**

1. Scoring／round／IVR／TC **transaction** 仍喺 `events/…/matches/{id}`（需要 config）  
2. TX committed 後 **mirror** live 欄位 → `matchLive/{eventId}/{matchId}`  
3. Timer／announcement／IVR remaining：**dual-write** state／stats  
4. Screen／Controller：`subscribeMatchView`（config leaf + matchLive；無 live 時 fallback 成個 legacy match）  
5. 建／刪 match／event 同步 mirror／remove `matchLive`  
6. **未**刪 legacy matches；**未**搬 config 去頂層 `matches/`

Rules：`database.rules.json` 已加 `matchLive`。**記得 Publish。**

---

## 7. Rules skeleton

見 repo 根目錄 **`database.rules.flattened.skeleton.json`**。

- **唔好**直接當 production `database.rules.json` 部署。  
- Dual-write 期間：舊 `events/…/courts|matches` 規則要暫時保留。  
- Judge 寫 `matchLive` 時，`providedCourtId`／`providedDeviceId` 應對 **`root.child('courts')`**（新 path），唔再對 `events/…/courts`。

---

## 8. Out of scope（呢份計劃唔包）

- 改 Firestore  
- 一次過 breaking 切正式站  
- 自動 migration GitHub Action（可後補）
