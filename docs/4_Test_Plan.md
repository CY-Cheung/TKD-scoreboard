# Test Plan（測試計劃）

**Product:** Taekwondo Cloud Scoring System  
**Runner (current):** Vitest — `npm test`；Rules — `npm run test:rules`  
**Baseline at doc time:** **263** unit／component tests（`npm test`）；**11** rules tests（emulator）  
**Document status:** Aligned with current `main`（post hygiene／docs cleanup）  
**Last reviewed against code:** 2026-08-13

> **Codebase baseline:** flat RTDB schema；unit + RTL component tests + RTDB rules emulator CI。真機／多 tab 整合仍多數人手。Schema → [`FIREBASE_MULTI_DEVICE_DESIGN.md`](./FIREBASE_MULTI_DEVICE_DESIGN.md)。  
> **用語：** Technical Card 中文一律「技術卡」；雙語標籤用 `English（中文）`。

> **`[待確認]`** = 計劃建議但尚未實作／未自動化嘅項目。

---

## 1. Objectives（目標）

1. **鎖定核心 Business Logic**：計分權重、投票窗口、PUN／PTG／PTF、回合 REST、IVR 配額投影。  
2. **防止 refactor 回歸**：domain／services 抽離後行為不變。  
3. **補齊高風險整合缺口**：Firebase transaction、搶席、`onDisconnect`、多 Screen 公告 — 目前多數仍靠人手。  
4. **Circuit breaker（開發習慣）**：同一模組連續失敗 >2 次 → 停手、restore、報告。（歷史 refactor 計劃 → [`archive/REFACTORING_PLAN.md`](./archive/REFACTORING_PLAN.md)）

---

## 2. Test pyramid（測試金字塔）

| Layer | Tooling（現況） | Scope |
|-------|----------------|------|
| **Unit** | Vitest（`npm test`） | score／vote／round／IVR／paths／seat／page helpers |
| **Component** | Testing Library + jsdom | `*.test.jsx`（例：`ScreenUnconfigured`、`MatchActionButtons`、`BrandSplitUserBadge`） |
| **Rules** | `@firebase/rules-unit-testing` + RTDB emulator | `npm run test:rules`；CI `rules` job |
| **E2E / Manual smoke** | 人手 checklist（本文件 §6） | 真實 Google／flat RTDB／多機；Playwright **未開** |

---

## 3. Current automated coverage map（現有自動化）

| Area | Status |
|------|--------|
| Unit（domain／services／helpers） | **有** — `npm test` |
| Component（RTL） | **有** — 少量 smoke；更大 page tests 可選 |
| Rules emulator | **有** — `npm run test:rules` + GitHub Actions |
| E2E（Playwright） | **未開** |
| Manual | 現場同 PR checklist（§6） |

**已覆蓋／持續擴充嘅純邏輯：**

| Area | Focus |
|------|--------|
| Score math | weights `[1,2,3,4,6]` + opponent gamjeom |
| Score／round transactions | vote window、PUN／PTG、REST／PTF |
| IVR helpers | unlimited／cap／`projectIvrRemaining` |
| Court／match paths | flat `courts`／`matches/config`／`matchLive`／`matchIndex` |
| Seat grab helpers | claim／stale／bare string deviceId／disconnect list |
| PDF／event create | multi-day split naming |
| Screen helpers | matchTimer、kyeShi、board colors、normalizeMatchView |
| Rules structure + emulator | nested courts deny、flat courts、seat deviceId、matchLive |

**高風險仍多數人手：**

- `Controller.jsx` seat grab + `onDisconnect`（真機）
- Screen timer rAF + REST → `startNextRound`
- TC／IVR multi-tab finalize races
- `promoteWinner`（flat config）
- **Live** Console rules vs repo（需 Publish 核對）

---

## 4. Unit test plan — Business Logic（業務單元測試）

### 4.1 Scoring — Happy Path

| ID | Scenario | Expected |
|----|----------|----------|
| UT-S01 | Single mode `pointsStat` index 0 delta +1 | `pointsStat[0]++`；`recentScores` 有一筆；timestamp=`voteNow` |
| UT-S02 | Body／Head／Turning weights | totals follow `[1,2,3,4,6]` via `getScoreValue` |
| UT-S03 | Gam-jeom +1 on red | red gamjeom++；blue total score +1（對手罰分） |
| UT-S04 | Multiple mode：兩唔同 `deviceId` 同 side+index 喺窗口內 | 加分一次；清除該 side+index votes；`recentScores.seatNames` 含兩席 |
| UT-S05 | PTG：分差 ≥ `maxPointGap` | `winReason=PTG`；pause timer；dominant = 領先方 |
| UT-S06 | PUN：gamjeom ≥ `maxGamjeom` | `winReason=PUN`；dominant = 對手 |
| UT-S07 | Declare round winner（未達 roundsToWin） | REST、`restDuration`、reset points／gamjeom、保留 `ivrRemaining` |
| UT-S08 | Declare至 `roundsToWin` | `winReason=PTF`、`isFinished`、phase ROUND |

**Status:** 目標案例多數已有 Vitest 覆蓋（`src/domain`／helpers）；以下仍作回歸清單。

### 4.2 Scoring — Edge Cases

| ID | Scenario | Expected |
|----|----------|----------|
| UT-E01 | `phase === 'REST'` 時改分 | transaction abort（`undefined`）；stats 不變 |
| UT-E02 | Multiple：同一 `deviceId` 投兩次 | 唔加分 |
| UT-E03 | Multiple：第二票超過 `VOTE_WINDOW_MS` | 舊票被濾走；仍未達 2 unique → 唔加分 |
| UT-E04 | delta 令 points／gamjeom < 0 | clamp 到 0 |
| UT-E05 | single mode `delta <= 0` | 可減分；**唔** push `recentScores` |
| UT-E06 | 自訂 `maxGamjeom`／`maxPointGap`／`roundsToWin` | 用 match rules，唔用硬編碼 5／15／2 |
| UT-E07 | 清除後分差唔再成立 | 舊 `winReason` PTG／PUN → `null` |
| UT-E08 | `pauseNow` vs `voteNow` 分離 | pause 用 wall clock；vote 可用 server offset（契約測試） |
| UT-E09 | `gamjeomAvoiding` | 同時加 gamjeom + avoiding；計入對方總分 |
| UT-E10 | IVR `projectIvrRemaining`：unlimited + reject | → 0；unlimited + accept → 仍 unlimited |

**Status on `main`:** 多數已有 domain／helper 測試；未覆蓋項繼續用回歸清單追。

### 4.3 Event creation — Happy / Edge

| ID | Scenario | Expected |
|----|----------|----------|
| UT-C01 | 手動 Create Event 預設 rules | defaults from `defaultRules` |
| UT-C02 | 單日 PDF → 單一 event record | matches populated |
| UT-C03 | 多日 PDF → `_Day{n}_{YYYYMMDD}` 子 Event | 多 record |
| UT-C04 | CourtSetup N courts（1–12）vs DataImport `court1` | **行為差異要鎖定**（已知產品差異） |

---

## 5. Integration test plan（整合測試 — 建議）

> **Rules 層：** 已有 emulator CI（`npm run test:rules`）。  
> **App 整合（多機／onDisconnect／多 Screen）：** 仍建議人手或未來加深 emulator／E2E → 以下為建議規格。

### 5.1 Most complex feature A — Multiple-mode valid point

**Happy Path**

1. Seed match + court `refereeMode=multiple`；J1／J2 已入席（flat `courts/.../referees`）。  
2. J1 按 Body(+2)；`matchLive/.../votes` 長度 1；`pointsStat` 未變。  
3. 500ms 內 J2 按同一 Body；`matchLive` `pointsStat[1]++`；Screen `recentScores` 出現。  
4. Screen 顯示分數同步。

**Edge Cases**

| Case | Expect |
|------|--------|
| J2 喺 1001ms 後先按 | 唔加分（或只保留新票） |
| J1 用兩個 tab 同一 `deviceId` | 唔加分 |
| 計時 `isPaused=true` 時 Controller 按掣 | **唔寫分**（Controller guard） |
| REST phase 時強行 call Api | abort |

### 5.2 Most complex feature B — Seat grab + disconnect

**Happy Path**

1. 空席；裝置 A 進 Controller → 佔 J1；flat `courts/.../referees/J1` 有 `deviceId`。  
2. 裝置 B → J2；C → J3。  
3. A 關閉分頁／離線 → `onDisconnect` 清 J1；新裝置可再搶 J1。

**Edge Cases**

| Case | Expect |
|------|--------|
| 三席已滿 | UI「Court is Full」；唔覆蓋他人席 |
| Google Admin 開 Controller | `Admin` 席邏輯；**唔佔** J1–J3 |
| React StrictMode double mount | 400ms delay 避免誤雙搶／誤清 → **回歸必測** |
| 搶席 race（兩機同時搶同一空席） | 只有一個 transaction 成功 |

### 5.3 Most complex feature C — Technical Card（技術卡）reject（多 Screen）

**Happy Path**

1. Edit 開 TC → Reject → 所有 Screen 顯示 3s 公告。  
2. Finalize 後該 side gamjeom +1 **一次**。  
3. Accept 路徑分數不變。

**Edge Cases**

| Case | Expect |
|------|--------|
| 兩個 Screen 同時 finalize | 只有一次 +1 gamjeom |
| Step 1／2 進行中再按 TC | 被 guard 擋住 |
| 後加入嘅 Screen | 跟 `startedAt` 顯示剩餘時間 |

### 5.4 IVR quota integration

| Case | Expect |
|------|--------|
| Match `ivrQuota` 優先於 Event | cap 正確 |
| 空 = WT unlimited (`-1`) | Accept 保持 unlimited；Reject → 0 |
| 換回合／REST | `ivrRemaining` **保留**（match-scoped） |

### 5.5 Rules security（已部分自動化）

| Case | Expect | Automation |
|------|--------|------------|
| Public read events | allow | emulator |
| Nested `events/.../courts` write | deny | emulator |
| Unauth flat courts write（event exists） | deny | emulator |
| Seat write with `deviceId` | allow when empty | emulator |
| Owner `matchLive` write | allow | emulator |
| 有效 `providedDeviceId` 對應 J1 score path | allow | **加深中** |
| 非 creator 刪 event | deny（除非 `coAdmins`） | **加深中** |

---

## 6. Manual smoke checklist（人手驗收）

### 6.1 P0 paths（每次 release 建議）

- [ ] Google 登入 → Court Setup → 入 Court → `/home`
- [ ] 返回 Court Setup：event session 清；Google 仍在
- [ ] Create Event（手動）+ Load Match → Screen 顯示選手
- [ ] Space 計時；Controller QR 搶 J1；single mode 得分即現
- [ ] 切 multiple：兩機 1 秒內同分先加
- [ ] Gam-jeom 至 PUN；分差至 PTG；判勝 → REST → 下一回合 → PTF
- [ ] Technical Card（技術卡）Accept／Reject（多 Screen 若可）
- [ ] IVR Accept／Reject 同配額顯示
- [ ] Kye-shi 倒數完自動停
- [ ] Promote Winner 寫入下一場

### 6.2 PDF / bracket

- [ ] 單日 HKTKDA PDF
- [ ] 多日 PDF 子 Event 命名
- [ ] Bracket 顯示同晉級

---

## 7. Non-functional / regression notes

| Topic | Guidance |
|-------|----------|
| Performance | `[待確認]` 無正式 perf budget；留意 Screen 多個 `onValue` + rAF |
| Accessibility | `[待確認]` 無 a11y 自動化 |
| Visual | Landing／glass UI 靠人手；無 screenshot CI |
| Cross-browser | 現場主力 Chromium；iOS Safari Controller → 建議人手抽樣 |

---

## 8. CI（現況）

| Step | Command／action |
|------|-----------------|
| Install | `npm ci` |
| Unit + RTL | `npm test` |
| Build | `npm run build` |
| Rules emulator | `npm run test:rules`（需 Java） |
| Lint | `npm run lint`（建議；workflow 可選加） |

Workflow：`.github/workflows/ci.yml`（`unit` + `rules` jobs）。

---

## 9. Priority backlog for new tests

| Priority | Item |
|----------|------|
| P0 | 加深 rules：matchLive seat device path、delete event ACL |
| P0 | TC／IVR finalize idempotency（transaction）真機／emulator |
| P1 | 更大 RTL page tests（可選） |
| P1 | Api IVR pure helpers → `domain/` + UT-E10 unit tests |
| P2 | Playwright E2E smoke |
| P2 | pdfParser fixture golden tests |

---

## 10. Document history

| Date | Change |
|------|--------|
| 2026-08-10 | Initial test plan：`main` 零自動化；列出目標案例同風險缺口 |
| 2026-08-12 | Align Waves 9–11：RTL、rules emulator CI、213 unit tests baseline |
| 2026-08-13 | Baseline 升至 **263** unit；refactor 計劃封存；P1 可選：IVR helpers → `domain/` + UT-E10 |
