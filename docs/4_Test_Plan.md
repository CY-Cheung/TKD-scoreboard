# Test Plan（測試計劃）

**Product:** Taekwondo Cloud Scoring System  
**Runner (current on `main`):** **無** — `package.json` 未有 `test` script  
**Baseline at doc time:** **0** automated tests on `main`  
**Document status:** Reverse-engineered gaps + forward-looking plan  
**Last reviewed against code:** 2026-08-10

> **Codebase baseline:** `main` @ 分析當日。Google Auth 同 Event／Court session 現時同喺 `AuthContext`。計分邏輯主要喺 `src/Api.js`（尚未拆 `src/domain/`）。**未有** `npm test`／Vitest。平行 refactor 分支可能另有結構 — 唔當作已合入 `main`。

> **`[待確認]`** = 計劃建議但尚未實作／未自動化嘅項目。  
> 平行 refactor 分支或已引入 Vitest；**合入前唔好當 `main` 已有 77 tests**。

---

## 1. Objectives（目標）

1. **鎖定核心 Business Logic**：計分權重、投票窗口、PUN／PTG／PTF、回合 REST、IVR 配額投影。  
2. **防止 refactor 回歸**：domain／services 抽離後行為不變。  
3. **補齊高風險整合缺口**：Firebase transaction、搶席、`onDisconnect`、多 Screen 公告 — 目前多數仍靠人手。  
4. **Circuit breaker（同 refactor 計劃）**：同一模組連續失敗 >2 次 → 停手、restore、報告。

---

## 2. Test pyramid（測試金字塔）

| Layer | Tooling（現況／建議） | Scope |
|-------|----------------------|-------|
| **Unit** | Vitest／Jest（**建議新增**） | 先抽純函式：score／vote／round／IVR |
| **Component** | Testing Library | `[待確認]` 未見正式 RTL setup |
| **Integration** | Firebase emulator **或** 契約測試 | `[待確認]` 未見 emulator CI |
| **E2E / Manual smoke** | 人手 checklist（本文件 §6） | 真實 Google／RTDB／多機 |

---

## 3. Current automated coverage map（現有自動化）

| Area | Status on `main` |
|------|------------------|
| Unit / component / e2e | **None**（無 test files、無 `npm test`） |
| Manual | 依賴開發者現場同 PR checklist |

**建議最先自動化嘅純邏輯（而家仍嵌喺 `Api.js`／頁面）：**

| Area | Suggested extract／test focus |
|------|-------------------------------|
| Score math | weights `[1,2,3,4,6]` + opponent gamjeom |
| Score transaction | vote window、unique `deviceId`、PUN／PTG、REST abort |
| Round transaction | REST vs PTF；保留 `ivrRemaining` |
| IVR helpers | unlimited／cap／`projectIvrRemaining` |
| PDF／event create | multi-day split naming |
| Controller params | URL／hash／sessionStorage fallback |
| Announcement timing | 3000ms TC／IVR |

**高風險仍未自動化：**

- `Controller.jsx` seat grab + 400ms delay + `onDisconnect`
- Screen timer `requestAnimationFrame` + REST → `startNextRound`
- TC／IVR multi-tab finalize races
- `promoteWinner`
- `database.rules.json` rule tests

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

**Status on `main`:** **未自動化** — 以上為目標案例。

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

**Status on `main`:** **未自動化**；建議抽純函式後先覆蓋 UT-E01–E10。

### 4.3 Event creation — Happy / Edge

| ID | Scenario | Expected |
|----|----------|----------|
| UT-C01 | 手動 Create Event 預設 rules | defaults from `defaultRules` |
| UT-C02 | 單日 PDF → 單一 event record | matches populated |
| UT-C03 | 多日 PDF → `_Day{n}_{YYYYMMDD}` 子 Event | 多 record |
| UT-C04 | CourtSetup N courts（1–12）vs DataImport `court1` | **行為差異要鎖定**（已知產品差異） |

---

## 5. Integration test plan（整合測試 — 建議）

> 現況：**未見** Firebase Emulator CI。以下為建議規格；實作前需選 emulator 或 staging project → `[待確認]`。

### 5.1 Most complex feature A — Multiple-mode valid point

**Happy Path**

1. Seed match + court `refereeMode=multiple`；J1／J2 已入席。  
2. J1 按 Body(+2)；RTDB `votes` 長度 1；`pointsStat` 未變。  
3. 500ms 內 J2 按同一 Body；`pointsStat[1]++`；Screen `recentScores` 出現。  
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

1. 空席；裝置 A 進 Controller → 佔 J1；RTDB 有 `deviceId`。  
2. 裝置 B → J2；C → J3。  
3. A 關閉分頁／離線 → `onDisconnect` 清 J1；新裝置可再搶 J1。

**Edge Cases**

| Case | Expect |
|------|--------|
| 三席已滿 | UI「Court is Full」；唔覆蓋他人席 |
| Google Admin 開 Controller | `Admin` 席邏輯；**唔佔** J1–J3 |
| React StrictMode double mount | 400ms delay 避免誤雙搶／誤清 → **回歸必測** |
| 搶席 race（兩機同時搶同一空席） | 只有一個 transaction 成功 |

### 5.3 Most complex feature C — Technical Card reject（多 Screen）

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

### 5.5 Rules security（建議）

用 Emulator Rules unit tests：

| Case | Expect |
|------|--------|
| 未 auth、無 seat device 寫 match | deny |
| 有效 `providedDeviceId` 對應 J1 | allow score tx |
| 非 creator 刪 event | deny（除非 `coAdmins` — UI `[待確認]`） |

---

## 6. Manual smoke checklist（人手驗收）

### 6.1 P0 paths（每次 release 建議）

- [ ] Google 登入 → Court Setup → 入 Court → `/home`
- [ ] 返回 Court Setup：event session 清；Google 仍在
- [ ] Create Event（手動）+ Load Match → Screen 顯示選手
- [ ] Space 計時；Controller QR 搶 J1；single mode 得分即現
- [ ] 切 multiple：兩機 1 秒內同分先加
- [ ] Gam-jeom 至 PUN；分差至 PTG；判勝 → REST → 下一回合 → PTF
- [ ] Technical Card Accept／Reject（多 Screen 若可）
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

## 8. CI recommendations（建議）

| Step | Command／action |
|------|-----------------|
| Install | `npm ci` |
| Unit | `npm test` |
| Build | `npm run build` |
| Lint | `npm run lint` |
| Emulator suite | `[待確認]` 未接入 |

建議 CI 最少跑 lint + build；有測試後再加 `npm test`。

---

## 9. Priority backlog for new tests

| Priority | Item |
|----------|------|
| P0 | Rules emulator tests for match write + seat grab |
| P0 | TC／IVR finalize idempotency（transaction） |
| P1 | Screen timer pure extract + tests（而家仍 deferred） |
| P1 | Seat grab helper extract + tests（而家仍 deferred） |
| P2 | RTL smoke：ProtectedRoute redirect、Landing CTA |
| P2 | pdfParser fixture golden tests |

---

## 10. Document history

| Date | Change |
|------|--------|
| 2026-08-10 | Initial test plan：`main` 零自動化；列出目標案例同風險缺口 |
