# WT 2026 Spec（已完成）

本檔係 WT 2026 相關功能嘅 **規格紀錄（Spec）**。  
**開發清單已全部完成**（2026-08-13）；以下章節保留作為驗收／行為參考。

> **用語：** Technical Card 中文一律「技術卡」（唔用「技術警告牌」「技術牌」）。英文 UI 字串維持 `Technical Card`。雙語標籤用 `English（中文）`。

---

## 完成清單

- [x] **1. Instant Video Replay（IVR）錄影重播挑戰卡** — 詳細規格見下方 **[IVR UI Flow Spec](#ivr-ui-flow-spec)**
- [x] **2. Technical Card（技術卡）** — 現況摘要見下方 **[Technical Card（技術卡）](#technical-card技術卡)**
- [x] **3. 微調裁判紀錄顯示** — red／blue log 顏色同 icon 已完成

---

## Technical Card（技術卡）

> **狀態**：已合入主線；多裝置同步見 [`docs/FIREBASE_MULTI_DEVICE_DESIGN.md`](docs/FIREBASE_MULTI_DEVICE_DESIGN.md)。

### 概述

* **觸發位置**：`Edit.jsx` 主裁面板內，Blue / Red 的 **Technical Card（技術卡）** 按鈕。
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

## IVR UI Flow Spec

> **狀態**：已實作（Step 1 Confirm + Step 2 glass card + quota transaction）。  
> **與 Technical Card（技術卡）之分**：IVR = Coach 舉 **Blue/Red card** 申請 **Instant Video Replay**；Technical Card（技術卡）= **Technical Review Request**；兩者 flow 類似但 **quota 規則不同**。

### 概述

* **觸發位置**：`Edit.jsx` 主裁面板內，Blue / Red 的 **IVR** 按鈕（`FilePlayFill` icon）。
* **UI Flow**（同 Technical Card）：Edit 底欄 Step 1 Confirm → Firebase 同步 Step 2 glass card（**3 秒**）→ finalize → idle。
* **多 Screen 同步**：Step 2 寫入 Firebase `state.ivrAnnouncement`；同一 Event + Court + Match 嘅**所有 Screen** 一齊顯示。
* **大螢幕 IVR icon**（bottom 區）：有 **剩餘 quota**（含無限）時顯示；**0** 時 **hide / dim**。
* **互斥**：IVR flow 進行中不可開 Technical Card（反之亦然）；avoiding gam-jeom popup 開啟時兩者都唔開。

---

### IVR Quota 規則

Quota 存於 `stats.{red|blue}.ivrRemaining`；上限由 **Event 預設 + Match 可 override** 決定。

#### 設定來源

| 層級 | 欄位 | 說明 |
|------|------|------|
| Event | `settings.ivrQuota` | 賽事預設；**留空** = 無限（`IVR_UNLIMITED = -1`） |
| Match | `config.rules.ivrQuota` | 可 override Event；**留空** = 繼承 Event（若 Event 都留空 → 無限） |

**「留空」** = 欄位唔填（`null` / undefined），**唔係** `0`。儲存／執行時用 `IVR_UNLIMITED = -1` 表示無限。

#### 模式 A — 無限（Event 同 Match 都留空 → `-1`）

| 項目 | 規則 |
|------|------|
| 起始 quota | **無限**（`ivrRemaining = -1`） |
| **Accept** | **保持無限**（`-1`） |
| **Reject** | **歸零**（`-1` → `0`） |

若要嚴格 WT「每場 1 次」，請喺 Event／Match 明確設 `ivrQuota = 1`。

#### 模式 B — 已設定 `ivrQuota = N`（N ≥ 1）

| 項目 | 規則 |
|------|------|
| 起始 quota | **N** / side |
| **Accept** | **減 1**（N → N−1） |
| **Reject** | **直接歸零** → **0** |

#### Quota = 0 時

* Edit 內 IVR 按鈕 **disabled**。
* 大螢幕 bottom IVR icon **hide / dim**。

---

### 流程狀態機

```
idle
  → 點擊 Blue/Red IVR 按鈕（有剩餘／無限）
Step 1：確認 popup（Edit 底欄）
  → Accept  → ivrAnnouncement → Step 2 → 3 秒 → finalize（更新 quota）→ idle
  → Reject  → ivrAnnouncement → Step 2 → 3 秒 → finalize（更新 quota）→ idle
  → Cancel  → idle
```

* `finalizeIvrAnnouncement` 用 `runTransaction` 清除公告並原子更新 `ivrRemaining`。

---

### Step 1 — 確認 Popup

| 項目 | 規格 |
|------|------|
| **位置** | Edit 底欄內 overlay |
| **元件** | `IVRConfirm.jsx` |
| **標題** | `Blue: IVR` / `Red: IVR` |
| **按鈕** | **Accept**｜**Reject**｜**Cancel** |

---

### Step 2 — 結果公告 Glass Card（3 秒）

| 項目 | 規格 |
|------|------|
| **位置** | Screen 中央 portal |
| **尺寸／UI** | 同 QR／Technical Card glass card |
| **顯示時長** | 3 秒；`startedAt` 同步倒數 |
| **左半標題** | **`Video Replay`** + `FilePlayFill` |

**`projectIvrRemaining(current, decision)`**：

| 模式 | Accept | Reject |
|------|--------|--------|
| **無限**（`-1`） | `-1` | `0` |
| **Configured N** | `max(0, current − 1)` | `0` |

Accept 右半：`Request Accepted` + ○；仍有剩餘／無限時多一行 `Return card to {Side} Coach`。  
Reject 右半：`Request Rejected` + ✕（固定 2 行；唔改分數）。

---

### Firebase Schema（IVR）

```
matchLive/{eventId}/{matchId}/state/ivrAnnouncement
matchLive/{eventId}/{matchId}/stats/{side}.ivrRemaining
events/{eventId}/settings/ivrQuota          ← 留空 = 無限 (-1)
matches/{eventId}/{matchId}/config/rules/ivrQuota
```

### 設定 UI

| 位置 | 說明 |
|------|------|
| `CourtSetup.jsx` | Event `settings.ivrQuota`；**唯一**建 Event／PDF 入口 |
| `DataImport.jsx` | Match `config.rules.ivrQuota` |
| `Api.js` | `IVR_UNLIMITED`、`projectIvrRemaining`、`startIvrAnnouncement`、`finalizeIvrAnnouncement` |

---

### 實作檔案

| 檔案 | 職責 |
|------|------|
| `src/Components/IVRFlow/IVRConfirm.jsx` | Step 1 |
| `src/Components/IVRFlow/IVRAnnouncement.jsx` | Step 2 |
| `src/Pages/Screen/Edit.jsx` | IVR 按鈕、Step 1 |
| `src/Pages/Screen/Screen.jsx` | 訂閱公告、bottom icon |
| `src/Api.js` | quota helpers + announce／finalize |

---

*備忘錄建立：2026-08-08*  
*Technical Card／IVR 完成：2026-08-10*  
*Quota 對齊程式（無限 `-1`）：2026-08-13*  
*清單全部完成（含裁判 log 微調）；檔案改為 Spec 定位：2026-08-13*
