# 📝 WT 2026 新賽例開發備忘錄 (TODO)

本檔案記錄 WT 2026 新賽例功能之開發清單與規格（Spec）。

---

## 待開發功能清單

- [ ] **1. Instant Video Replay (IVR) 錄影重播挑戰卡**
  * 為每位選手設定預設的 IVR 挑戰次數（通常為 1 次）。
  * 在大螢幕選手名字旁加入 IVR 卡片圖示顯示狀態。
  * 在 Admin 控制台加入「使用 IVR」選項，並能選擇「挑戰成功 (保留 Quota)」或「挑戰失敗 (扣除 Quota)」。

- [ ] **2. Technical Card (技術警告牌)** — 詳細規格見下方 **[Technical Card UI Flow Spec](#technical-card-ui-flow-spec)**

- [ ] **3. 微調裁判紀錄顯示**
  * match 裁判紀錄顯示在 red log 和 blue log 已完成。
  * 下一步：微調裡面的顏色和 icon。

---

## Technical Card UI Flow Spec

### 概述

* **觸發位置**：`Edit.jsx` 主裁面板內，Blue / Red 的 **Technical Card** 按鈕。
* **業務規則（已確認）**：
  * **Accept**：**只公告**，不寫入 Firebase、不變更分數或警告計數。
  * **Reject**：**先**顯示 Step 2 結果卡（3 秒）→ 卡片自動關閉 **後**，再自動呼叫 `updateScoreAndCheckRules(..., 'gamjeom', null, 1)` 對該 side 加 1 個 Gam-jeom（**唔好**在按下 Reject 當下立即加分）。
* **觀眾可見性**：Step 2 結果卡須於 **主屏 Screen 中央** 顯示，現場觀眾必須看得到（不可僅限 Edit 抽屜內）。

### 流程狀態機

```
idle
  → 點擊 Blue/Red Technical Card 按鈕
Step 1：確認 popup（螢幕正中，同 avoiding gam-jeom）
  → Accept  → Step 2（accept）→ 3 秒後自動關閉 → idle
  → Reject  → Step 2（reject）→ 3 秒後自動關閉 → Gam-jeom +1 → idle
```

* Step 1 進行中時，不應重複開啟第二個 Technical Card flow。
* Step 2 顯示期間，建議禁止再次觸發（或等 3 秒結束後才允許）。

---

### Step 1 — 確認 Popup

| 項目 | 規格 |
|------|------|
| **位置** | **螢幕正中**（與 avoiding gam-jeom popup 相同：全屏 overlay + 居中 `glass-panel`） |
| **渲染** | 建議 `createPortal` 至 `document.body`，避免被 `.edit-bar` 裁切 |
| **視覺** | 與 avoiding gam-jeom popup **相同 UI**（半透明背景、`glass-panel`、圓角、blur） |
| **標題** | `Blue: Technical Card` 或 `Red: Technical Card`（注意拼寫：**Technical**，非 Techinical） |
| **按鈕** | 標題下方兩粒並排：**左** `Accept`｜**右** `Reject → Gam-jeom +1` |
| **Cancel** | 可選；若實作，行為與 avoiding popup 一致（關閉 Step 1、回到 idle） |

**點擊後：**

* **Accept**：關閉 Step 1 → 進入 Step 2（accept 樣式）→ 3 秒後關閉 → **不呼叫 API**。
* **Reject**：關閉 Step 1 → 進入 Step 2（reject 樣式）→ **3 秒後關閉卡片** → **然後**自動 Gam-jeom +1（`updateScoreAndCheckRules`）。

---

### Step 2 — 結果公告 Glass Card（3 秒）

| 項目 | 規格 |
|------|------|
| **位置** | **主屏 Screen 中央**（全屏 overlay 居中） |
| **尺寸／UI** | 與按 **`Q`** 顯示的 QR Code **相同 glass card**：`.qrcode-modal-overlay`、`.qrcode-split-card`（`max-width: 65cqi`、`aspect-ratio: 16/9` 等） |
| **顯示時長** | **3 秒**後自動關閉（`setTimeout`；component unmount 時須 `clearTimeout`） |
| **觀眾** | 大螢幕投影觀眾必須清晰可見 |

#### 左半（50%）

* 兩個 Bootstrap Icons **左右並排、一併置中**：
  * `FilePlayFill`：顏色跟 side — **Blue** 用藍色（建議 `#0000aa` / `--blue-primary`）、**Red** 用紅色（建議 `#aa0000` / `--red-primary`）
  * `FileFontFill`：**永遠綠色**（例如 `#00FF00` 或 `#22c55e`）

#### 右半（50%）

* 左側：**大 icon**（高度與右側三行文字區域對齊）
* 右側：**三行文字**（由上而下）

| 行 | Accept | Reject |
|----|--------|--------|
| **Row 1（Title）** | `Blue Technical Card` / `Red Technical Card` | 同左 |
| **Row 2（Message）** | `Request Accepted` | `Request Rejected` |
| **Row 3** | `Return card to coach` | Blue：**Chung**（藍色）+ ` Gam-jeom`｜Red：**Hung**（紅色）+ ` Gam-jeom` |

**Row 3 說明（重要）：**

* **勿使用** `matchData` 內真實選手姓名。
* 第三行文案供 **Centre Referee (中心裁判)** 跟隨**口令**宣讀；Blue 用 **Chung**，Red 用 **Hung**（寫死 side 對應文案即可）。
* **Reject Row 3 字色**：
  * **Blue side**：`Chung` 字樣須為**藍色**（建議 `#0000aa` / `--blue-primary`）；` Gam-jeom` 維持預設白色（或與其他 row 一致）。
  * **Red side**：`Hung` 字樣須為**紅色**（建議 `#aa0000` / `--red-primary`）；` Gam-jeom` 維持預設白色（或與其他 row 一致）。

**大 Icon 規格：**

| 結果 | Icon | 顏色 |
|------|------|------|
| Accept | `Circle`（或 `CheckCircle`，實作時擇一固定） | **白色** |
| Reject | `XLg` | **黃色**（`#FFFF00`） |

---

### 建議實作結構（供開發參考）

| 檔案 | 職責 |
|------|------|
| `src/Components/TechnicalCardFlow/TechnicalCardConfirm.jsx` | Step 1 確認 popup |
| `src/Components/TechnicalCardFlow/TechnicalCardAnnouncement.jsx` | Step 2 結果 glass card（3 秒） |
| `TechnicalCardFlow.css` | Step 1 專用樣式；Step 2 重用 `QRCodeDisplay.css` 之 split card class |
| `src/Pages/Screen/Screen.jsx` | 掛載 Announcement（確保主屏觀眾可見；state 可由 Edit 經 callback 或 shared state 觸發） |
| `src/Pages/Screen/Edit.jsx` | Technical 按鈕 → 開啟 flow；Reject 時於 **Step 2 關閉後** 才呼叫 `Api.js` |

**渲染注意：**

* Step 2 **必須**在 `Screen` 層或 `createPortal(document.body)` 渲染，**不可**僅存在於已關閉的 Edit 抽屜內。
* Step 2 的 `z-index` 應與 QR modal 同級（例如 `9999`），高於 Edit bar（`1001`）。

**與其他 UI 互斥（建議）：**

* avoiding gam-jeom popup 開啟時，不開 Technical Card flow。
* 可選：QR modal 與 Technical 結果卡不要同時顯示。

---

### 驗收清單 (Acceptance Checklist)

- [ ] Blue / Red Technical 按鈕可開啟 Step 1（正中 glass popup）
- [ ] Accept：只顯示 Step 2（白圈 + 三行含 `Return card to coach`），3 秒後消失，**分數不變**
- [ ] Reject：Step 2 顯示黃色 X + Row 3（**Chung** 藍色／**Hung** 紅色 + ` Gam-jeom`）→ 3 秒後卡片消失 → **然後** Gam-jeom +1
- [ ] Step 2 在主屏 Screen 中央、尺寸與 QR glass card 一致
- [ ] 現場觀眾在大螢幕上可清楚看見 Step 2
- [ ] 3 秒自動關閉；快速連按不造成卡死或重疊

---

## 待開發（IVR 相關問題）

IVR 規格仍待後續補充；Technical Card 業務規則**已確認**（見上文）。

---

*備忘錄建立：2026-08-08*  
*Technical Card Spec 更新：2026-08-10（Reject 延遲加分、Row 3 字色）*
