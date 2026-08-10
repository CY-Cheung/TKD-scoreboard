# 📝 WT 2026 新賽例開發備忘錄 (TODO)

本檔案記錄 WT 2026 新賽例功能之開發清單與規格（Spec）。

---

## 待開發功能清單

- [ ] **1. Instant Video Replay (IVR) 錄影重播挑戰卡**
  * 為每位選手設定預設的 IVR 挑戰次數（通常為 1 次）。
  * 在大螢幕選手名字旁加入 IVR 卡片圖示顯示狀態。
  * 在 Admin 控制台加入「使用 IVR」選項，並能選擇「挑戰成功 (保留 Quota)」或「挑戰失敗 (扣除 Quota)」。

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
  * **Accept**：顯示 Step 2 公告 → **5 秒**後關閉 → **分數不變**。
  * **Reject**：顯示 Step 2 公告 → **5 秒**後關閉 → **`updateScoreAndCheckRules(..., 'gamjeom', null, 1)`** 對該 side 加 1 Gam-jeom（**唔好**在按下 Reject 當下立即加分）。
* **多 Screen 同步**：Step 2 寫入 Firebase `state.techCardAnnouncement`；同一 Event + Court + Match 嘅**所有 Screen** 一齊顯示 glass card（唔限操作嗰部機）。

### 流程狀態機

```
idle
  → 點擊 Blue/Red Technical Card 按鈕
Step 1：確認 popup（Edit 底欄內，同 avoiding gam-jeom）
  → Accept  → 寫入 Firebase → Step 2（accept）→ 5 秒 → finalize → idle
  → Reject  → 寫入 Firebase → Step 2（reject）→ 5 秒 → finalize → Gam-jeom +1 → idle
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

### Step 2 — 結果公告 Glass Card（5 秒）

| 項目 | 規格 |
|------|------|
| **位置** | **主屏 Screen 中央**（`createPortal(document.body)` + `.qrcode-modal-overlay`） |
| **尺寸／UI** | 與 QR Code glass card 相同：`.qrcode-split-card`（`max-width: 65cqi`、`aspect-ratio: 16/9`） |
| **顯示時長** | **5 秒**（`ANNOUNCEMENT_DURATION_MS = 5000`）；以 Firebase `startedAt` 計剩餘時間，後加入嘅 Screen 同步倒數 |
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
| `src/Components/TechnicalCardFlow/TechnicalCardAnnouncement.jsx` | Step 2（5 秒 glass card） |
| `src/Components/TechnicalCardFlow/TechnicalCardFlow.css` | 公告樣式、glow、動畫 |
| `src/Pages/Screen/Edit.jsx` | 按鈕、Step 1 state、`onTechCardConfirm` |
| `src/Pages/Screen/Screen.jsx` | 訂閱 `techCardAnnouncement`、掛載 Step 2 |
| `src/Api.js` | `startTechCardAnnouncement`、`finalizeTechCardAnnouncement` |

---

### 驗收清單 (Acceptance Checklist)

- [x] Blue / Red Technical 按鈕可開啟 Step 1（Edit 底欄 glass popup，同 avoiding 一致）
- [x] Accept：Step 2 白圈 + Return card to Blue/Red Coach；5 秒後消失；**分數不變**
- [x] Reject：Step 2 四行（含 Chung/Hung Gam-jeom）→ 5 秒後消失 → **然後** Gam-jeom +1
- [x] Step 2 在主屏中央、尺寸與 QR glass card 一致
- [x] 同一 Court + Match 嘅所有 Screen 同步顯示 Step 2
- [x] 5 秒自動關閉；flow 進行中不可重複觸發

---

## 待開發（IVR 相關問題）

IVR 規格仍待後續補充。

---

*備忘錄建立：2026-08-08*  
*Technical Card 完成：2026-08-10（Firebase 多 Screen 同步、5 秒、Reject 四行 layout）*
