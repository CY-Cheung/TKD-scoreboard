# 📝 WT 2026 新賽例開發備忘錄 (TODO)

本檔案記錄 WT 2026 新賽例功能之開發清單與規格（Spec）。

---

## 待開發功能清單

- [x] **1. Instant Video Replay (IVR) 錄影重播挑戰卡** — **已實作**；詳細規格見下方 **[IVR UI Flow Spec](#ivr-ui-flow-spec)**

- [x] **2. Technical Card (技術警告牌)** — **已實作**；現況摘要見下方 **[Technical Card（已實作）](#technical-card已實作)**

- [ ] **3. 微調裁判紀錄顯示**
  * match 裁判紀錄顯示在 red log 和 blue log 已完成。
  * 下一步：微調裡面的顏色和 icon。

---

## Technical Card（已實作）

> **狀態**：2026-08-10 已合入主線；詳細多裝置同步見 [`docs/FIREBASE_MULTI_DEVICE_DESIGN.md`](docs/FIREBASE_MULTI_DEVICE_DESIGN.md) §4.1。

### 概述

* **觸發位置**：`Edit.jsx` 主裁面板內，Blue / Red 的 **Technical Card** 按鈕。
* **業務規則**：
  * **Accept**：顯示 Step 2 公告 → **3 秒**後關閉 → **分數不變**。
  * **Reject**：顯示 Step 2 公告 → **3 秒**後關閉 → **`updateScoreAndCheckRules(..., 'gamjeom', null, 1)`** 對該 side 加 1 Gam-jeom（**唔好**在按下 Reject 當下立即加分）。
* **多 Screen 同步**：Step 2 寫入 Firebase `state.techCardAnnouncement`；同一 Event + Court + Match 嘅**所有 Screen** 一齊顯示 glass card（唔限操作嗰部機）。

### 流程狀態機

```
idle
  → 點擊 Blue/Red Technical Card 按鈕
Step 1：確認 popup（Edit 底欄內，同 avoiding gam-jeom）
  → Accept  → 寫入 Firebase → Step 2（accept）→ 3 秒 → finalize → idle
  → Reject  → 寫入 Firebase → Step 2（reject）→ 3 秒 → finalize → Gam-jeom +1 → idle
  → Cancel  → idle
```

* Step 1 / Step 2 進行中時，禁止重複開 flow（本地 + Firebase 雙重 guard）。
* `finalizeTechCardAnnouncement` 用 `runTransaction` 清除公告，確保只加分一次。

---

### Step 1 — 確認 Popup

| 項目 | 規格 |
|------|------|
| **位置** | **Edit 底欄（`.edit-bar`）內** `position: absolute` overlay（與 avoiding gam-jeom popup 相同，**唔係**全屏居中） |
| **元件** | `TechnicalCardConfirm.jsx`（渲染於 `Edit.jsx` 內，**唔用** `createPortal`） |
| **標題** | `Blue: Technical Card` / `Red: Technical Card` |
| **按鈕** | `Accept`｜`Reject → Gam-jeom +1`｜`Cancel`（可選） |

---

### Step 2 — 結果公告 Glass Card（3 秒）

| 項目 | 規格 |
|------|------|
| **位置** | **主屏 Screen 中央**（`createPortal(document.body)` + `.qrcode-modal-overlay`） |
| **尺寸／UI** | 與 QR Code glass card 相同：`.qrcode-split-card`（`max-width: 65cqi`、`aspect-ratio: 16/9`） |
| **顯示時長** | **3 秒**（`ANNOUNCEMENT_DURATION_MS = 3000`）；以 Firebase `startedAt` 計剩餘時間，後加入嘅 Screen 同步倒數 |
| **同步** | `Api.startTechCardAnnouncement` 寫入；`Api.finalizeTechCardAnnouncement` 清除並（Reject 時）加分 |

#### 左半（50%）

* 上方：`FilePlayFill`（side 色）+ `FileFontFill`（綠 `#22c55e`）並排置中
* 下方：標題 **`Technical Card`**（較大字體）

#### 右半（50%）— 垂直排列

| 行 | Accept（3 行） | Reject（4 行） |
|----|----------------|----------------|
| 1 | `Request Accepted` | `Request Rejected` |
| 2 | 白圈 `Circle` icon | 黃色 `XLg` icon |
| 3 | `Return card to` **Blue/Red** `Coach` | 同左（**Blue/Red** 有 side 色） |
| 4 | — | **Chung**（藍）/ **Hung**（紅）+ ` Gam-jeom` |

* **勿使用** `matchData` 真實選手姓名；Row 3–4 供 Centre Referee 口令宣讀。
* 所有 icon 同文字有 subtle **white glow**（`TechnicalCardFlow.css`）。

---

### 實作檔案

| 檔案 | 職責 |
|------|------|
| `src/Components/TechnicalCardFlow/TechnicalCardConfirm.jsx` | Step 1（Edit 底欄） |
| `src/Components/TechnicalCardFlow/TechnicalCardAnnouncement.jsx` | Step 2（3 秒 glass card） |
| `src/Components/TechnicalCardFlow/TechnicalCardFlow.css` | 公告樣式、glow、動畫 |
| `src/Pages/Screen/Edit.jsx` | 按鈕、Step 1 state、`onTechCardConfirm` |
| `src/Pages/Screen/Screen.jsx` | 訂閱 `techCardAnnouncement`、掛載 Step 2 |
| `src/Api.js` | `startTechCardAnnouncement`、`finalizeTechCardAnnouncement` |

---

### 驗收清單 (Acceptance Checklist)

- [x] Blue / Red Technical 按鈕可開啟 Step 1（Edit 底欄 glass popup，同 avoiding 一致）
- [x] Accept：Step 2 白圈 + Return card to Blue/Red Coach；3 秒後消失；**分數不變**
- [x] Reject：Step 2 四行（含 Chung/Hung Gam-jeom）→ 3 秒後消失 → **然後** Gam-jeom +1
- [x] Step 2 在主屏中央、尺寸與 QR glass card 一致
- [x] 同一 Court + Match 嘅所有 Screen 同步顯示 Step 2
- [x] 3 秒自動關閉；flow 進行中不可重複觸發

---

## IVR UI Flow Spec

> **狀態**：2026-08-10 **已實作**（Step 1 Confirm + Step 2 glass card + quota transaction）。  
> **與 Technical Card 之分**：IVR = Coach 舉 **Blue/Red card** 申請 **Instant Video Replay**（WT Art. 21 相關）；Technical Card = **Technical Review Request**（§4），兩者 flow 類似但 **quota 規則不同**。

### WT 賽例背景（軟件相關摘要）

* Coach 向 Centre Referee 申請 **IVR**，Review Jury 於 **30 秒**內決定（操作備忘；scoreboard 可不計時）。
* Coach 舉 **blue / red card** 申請；申請範圍限 **舉牌前 5 秒內單一 action**（操作備忘）。
* **§6**：每 contest 預設 **1 次** appeal；TD 可按賽事級別改 quota（Head of Team meeting）。
* **§6**：若 appeal **成功**且請求被修正，coach **保留** appeal 權。
* **§2**：舉 card 後視為已使用 appeal，除非 judge's meeting 令 coach 滿意（軟件層面以 Accept/Reject 結果處理 quota）。
* 以下 **唔納入** 首版 scoreboard 邏輯（可日後擴展）：Head PSS 條件、最後 5 秒 Centre Referee 主動 IVR（§3.1）、無 IVR 系統時 protest 程序（§11）等。

---

### 概述

* **觸發位置**：`Edit.jsx` 主裁面板內，Blue / Red 的 **IVR** 按鈕（`FilePlayFill` icon）。
* **UI Flow**（同 Technical Card）：Edit 底欄 Step 1 Confirm → Firebase 同步 Step 2 glass card（**3 秒**）→ finalize → idle。
* **多 Screen 同步**：Step 2 寫入 Firebase `state.ivrAnnouncement`；同一 Event + Court + Match 嘅**所有 Screen** 一齊顯示（同 `techCardAnnouncement` 模式）。
* **大螢幕 IVR icon**（bottom 區 `bi-files`）：有 **剩餘 quota** 時顯示；**0** 時 **hide / dim**。
* **互斥**：IVR flow 進行中不可開 Technical Card（反之亦然）；avoiding gam-jeom popup 開啟時兩者都唔開。

---

### IVR Quota 規則（已確認）

Quota 存於 `stats.{red|blue}.ivrRemaining`；上限由 **Event 預設 + Match 可 override** 決定。

#### 設定來源

| 層級 | 欄位 | 說明 |
|------|------|------|
| Event | `settings.ivrQuota` | 賽事預設；**留空** = 用 WT 模式 |
| Match | `config.rules.ivrQuota` | 可 override Event；**留空** = 繼承 Event（若 Event 都留空 → WT 模式） |

**「留空」** = 欄位唔填（`null` / undefined），**唔係** `0`。

#### 模式 A — WT 模式（Event 同 Match 都留空）

| 項目 | 規則 |
|------|------|
| 起始 quota | **1** / side / contest |
| **Accept**（appeal 成功） | **唔扣** — 保留 appeal 權（對應 WT §6） |
| **Reject**（不成功） | **扣 1**（例如 1 → 0） |

#### 模式 B — 已設定 `ivrQuota = N`（N ≥ 1，Event 或 Match 任一層有值）

| 項目 | 規則 |
|------|------|
| 起始 quota | **N** / side（首次使用或 match 初始化時寫入 `ivrRemaining = N`） |
| **Accept** | **減 1**（N → N−1；例如 2 → 1） |
| **Reject** | **直接歸零**（剩餘 quota 全部失效 → **0**） |

**例子（N = 2）**：Accept → 1；Reject → 0。  
**例子（N = 1，有設定）**：Accept → 0；Reject → 0。（與 WT 模式不同：WT 模式 Accept 會保留 1。）

#### Quota = 0 時

* Edit 內 IVR 按鈕 **disabled**。
* 大螢幕 bottom IVR icon **hide / dim**。

---

### 流程狀態機

```
idle
  → 點擊 Blue/Red IVR 按鈕（ivrRemaining > 0）
Step 1：確認 popup（Edit 底欄內，同 avoiding / Technical Card）
  → Accept  → 寫入 Firebase ivrAnnouncement → Step 2（accept）→ 3 秒 → finalize（更新 quota）→ idle
  → Reject  → 寫入 Firebase ivrAnnouncement → Step 2（reject）→ 3 秒 → finalize（更新 quota）→ idle
  → Cancel  → idle
```

* Step 1 / Step 2 進行中時，禁止重複開 flow（本地 + Firebase 雙重 guard）。
* `finalizeIvrAnnouncement` 用 `runTransaction` 清除 `ivrAnnouncement` 並 **原子更新** `ivrRemaining`（避免多 Screen 重複扣減）。

---

### Step 1 — 確認 Popup

> **設計決定（2026-08-10）**：**唔揀** WT §1 申請原因；Step 1 同 **Technical Card** 一樣，只係標題 + Accept / Reject / Cancel。

| 項目 | 規格 |
|------|------|
| **位置** | **Edit 底欄（`.edit-bar`）內** `position: absolute` overlay（同 avoiding / Technical Card Confirm） |
| **元件** | `IVRConfirm.jsx`（規劃；渲染於 `Edit.jsx` 內，**唔用** `createPortal`） |
| **標題** | `Blue: IVR` / `Red: IVR` |
| **按鈕** | **Accept**｜**Reject**｜**Cancel**（Accept ≈ appeal upheld；Reject ≈ 不成立；文案待賽事方確認） |
| **前置** | `ivrRemaining > 0`；非其他 flow 進行中 |

---

### Step 2 — 結果公告 Glass Card（3 秒）

| 項目 | 規格 |
|------|------|
| **位置** | **主屏 Screen 中央**（`createPortal(document.body)` + `.qrcode-modal-overlay`） |
| **尺寸／UI** | 與 QR / Technical Card glass card 相同：`.qrcode-split-card`（`max-width: 65cqi`、`aspect-ratio: 16/9`） |
| **顯示時長** | **3 秒**（`ANNOUNCEMENT_DURATION_MS = 3000`）；以 Firebase `startedAt` 同步倒數 |
| **同步** | `Api.startIvrAnnouncement` 寫入；`Api.finalizeIvrAnnouncement` 清除並更新 quota |
| **樣式** | 重用 `TechnicalCardFlow.css`（`.tc-announce-*`、`.tc-row-*`、white glow）；card class：`ivr-announce-card tc-announce-card tc-side-{blue\|red} tc-decision-{accept\|reject}` |

> **設計決定（2026-08-10）**：Step 2 對齊 **Technical Card** 口令風格；左半標題 **`Video Replay`**；Accept **2–3 行**（Row 3 視乎 finalize 後是否仍有 quota）；Reject **固定 2 行**；**唔**顯示 `IVR Remaining` 行、**唔**加 Gam-jeom。

#### 左半（50%）— 完整文案

| 區塊 | 文案 | 備註 |
|------|------|------|
| **Icon** | `FilePlayFill` | 單一 icon；Blue / Red side 色；white glow；size ≈ `10.5cqi` |
| **標題** | **`Video Replay`** | 同 TC `.tc-announce-title`（`4.2cqi`、bold、置中、glow） |

**唔顯示**：選手姓名、Technical Card 第二 icon（`FileFontFill`）、申請原因、match 編號。

```
┌──────────────────┬──────────────────┐
│                  │  Request Accepted │
│    ▶ (side色)    │        ○          │  Accept（有 quota 時多一行 Return card）
│  Video Replay    │  Return card …   │
│                  │                   │
│                  │ Request Rejected  │  Reject
│                  │        ✕          │
└──────────────────┴──────────────────┘
```

#### 右半（50%）— 完整文案

**動態值**：

| 變數 | 來源 |
|------|------|
| `{SideWord}` | `"Blue"` \| `"Red"` |
| `{Remaining}` | finalize 後預期剩餘 quota（同 transaction 邏輯） |

**`{Remaining}` 計算**（`current` = `stats.{side}.ivrRemaining`）：

| 模式 | Accept | Reject |
|------|--------|--------|
| **WT**（Event + Match 都留空） | `current`（唔扣） | `max(0, current − 1)` |
| **Configured N** | `max(0, current − 1)` | `0` |

##### Accept — 2 或 3 行

| 行 | class | 文案 | 顯示條件 |
|----|-------|------|----------|
| **1** | `.tc-row.tc-row-2` | **`Request Accepted`** | 永遠 |
| **2** | `.tc-announce-status-icon` | 白圈 **`Circle`**（`#ffffff`） | 永遠 |
| **3** | `.tc-row.tc-row-3` | `Return card to `{SideWord}` Coach` | **僅當 `{Remaining} > 0`**；`{SideWord}` 用 `.tc-command-word.blue` / `.red` |

* Accept **唔加** `tc-reject-rows`（行距同 TC Accept 三行版）。
* `{Remaining} === 0` 時（例：Configured N=1 Accept）→ 只顯示 Row 1–2。

##### Reject — 固定 2 行

| 行 | class | 文案 | 顯示條件 |
|----|-------|------|----------|
| **1** | `.tc-row.tc-row-2` | **`Request Rejected`** | 永遠 |
| **2** | `.tc-announce-status-icon` | 黃色 **`XLg`**（`#FFFF00`） | 永遠 |

* Reject 右半加 class **`tc-reject-rows`**（同 TC Reject，收紧行距）。
* **唔顯示** Return card、quota 數字、Gam-jeom、Chung/Hung、分數變動。

#### 文案示例

| 場景 | 右半顯示 |
|------|----------|
| Blue Accept（WT，quota 仍 1） | `Request Accepted` → ○ → `Return card to` **Blue** `Coach` |
| Red Accept（N=1→0） | `Request Accepted` → ○（**無** Return card 行） |
| Blue Reject（WT，1→0） | `Request Rejected` → ✕ |
| Red Reject（N=2→0） | `Request Rejected` → ✕ |

#### Step 1 ↔ Step 2 用語對照

| Step 1 按鈕 | Step 2 Row 1 | 含義 |
|-------------|--------------|------|
| **Accept** | `Request Accepted` | Review Jury 接納 appeal |
| **Reject** | `Request Rejected` | Appeal 不成立 |
| **Cancel** | （唔進 Step 2） | — |

* Step 1 按鈕維持 **`Accept` / `Reject` / `Cancel`**（同 Technical Card）。

#### 實作備註

* `IVRAnnouncement.jsx` props：`visible`, `side`, `decision`, `startedAt`, `ivrRemaining`, `ivrWtMode`, `onComplete`。
* `projectIvrRemaining(current, decision, wtMode)` 同 finalize transaction 共用；Accept Row 3 用 `{Remaining} > 0` 判斷。
* **唔改分數**；quota 更新只喺 `finalizeIvrAnnouncement` transaction 內進行。

---

### Firebase Schema（規劃）

```
matches/{matchId}/state/
  ivrAnnouncement: { side, decision: "accept"|"reject", startedAt }

matches/{matchId}/stats/
  red.ivrRemaining: number
  blue.ivrRemaining: number

events/{eventId}/settings/
  ivrQuota: number | null     ← 留空 = WT 模式

matches/{matchId}/config/rules/
  ivrQuota: number | null     ← 留空 = 繼承 Event
```

---

### 設定 UI（已實作）

| 位置 | 欄位 | 說明 |
|------|------|------|
| `CourtSetup.jsx` | Event `settings.ivrQuota`（建立 + **編輯**） | 建立 modal 可設；選中賽事後建立者可 Save |
| `DataImport.jsx` | Match `config.rules.ivrQuota`（Rules 區） | 全局 quota；留空 = WT |
| `DataImport.jsx` | Event `settings.ivrQuota`（**僅**建立賽事 modal） | 同 CourtSetup |
| `Api.js` | lazy init `ivrRemaining` | 首次 IVR 或顯示時按 Event/Match 規則推算 |

---

### 建議實作結構（供開發參考）

| 檔案 | 職責 |
|------|------|
| `src/Components/IVRFlow/IVRConfirm.jsx` | Step 1（Edit 底欄） |
| `src/Components/IVRFlow/IVRAnnouncement.jsx` | Step 2（3 秒 glass card） |
| `src/Pages/Screen/Edit.jsx` | IVR 按鈕、Step 1、`onIvrConfirm` |
| `src/Pages/Screen/Screen.jsx` | 訂閱 `ivrAnnouncement`、bottom icon 顯示、掛載 Step 2 |
| `src/Api.js` | `resolveIvrQuota`、`resolveIvrRemaining`、`startIvrAnnouncement`、`finalizeIvrAnnouncement` |

---

### 驗收清單 (Acceptance Checklist)

- [x] Blue / Red IVR 按鈕可開啟 Step 1（Edit 底欄；quota > 0；同 Technical Card 三按鈕）
- [x] **WT 模式**（留空）：Accept 不扣 quota；Reject 扣 1
- [x] **設定 N=2**：Accept → 1；Reject → 0
- [x] **設定 N=1**：Accept → 0；Reject → 0
- [x] Quota = 0：按鈕 disabled + 大螢幕 icon hide/dim
- [x] Step 2 左半：`FilePlayFill` + 標題 **`Video Replay`**
- [x] Step 2 Accept：`Request Accepted` + ○；**有 quota 時** 先顯示 Return card
- [x] Step 2 Reject：`Request Rejected` + ✕（固定 2 行）
- [x] Step 2 3 秒 glass card；同一 Court + Match 所有 Screen 同步
- [x] finalize 用 transaction；快速連按唔會重複扣 quota
- [x] IVR 與 Technical Card flow 互斥

---

## 待開發（其他）

* 微調裁判紀錄顯示（見清單 #3）

---

*備忘錄建立：2026-08-08*  
*Technical Card 完成：2026-08-10（Firebase 多 Screen 同步、3 秒、Reject 四行 layout）*  
*IVR Spec 更新：2026-08-10（Video Replay 標題、Accept 2–3 行 conditional Return card、Reject 2 行）*
