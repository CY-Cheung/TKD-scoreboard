# 📘 邏輯驗證測試個案 (Test Cases)

---

### **Test Case 1: 「兩局直落」完結比賽 (PTF 驗證)**

呢個 Case 係要測試當其中一方連贏兩局，比賽係咪會即刻以 "PTF" (Win by Point Final) 狀態結束，而唔會入 Rest Time。

*   **模擬情景**: 紅方贏咗第一局，再贏埋第二局。
*   **操作步驟**:
    1.  **第一局**:
        *   開始比賽。
        *   幫紅方加分，或者藍方犯規，總之令紅方分數佔優。
        *   喺裁判控制台 (`Edit.jsx`)撳 **"Declare Round Winner"**，揀紅方。
    2.  **第二局**:
        *   系統會自動進入60秒休息時間，然後裁判撳 **"Start Round 2"**。
        *   再次幫紅方加分，令佢贏埋呢局。
        *   再次撳 **"Declare Round Winner"**，揀紅方。
*   **預期結果**:
    *   **計分板畫面 (`Screen.jsx`)**:
        *   背景**維持黃色** (Scoreboard Mode)，唔會變黑色嘅休息模式。
        *   中間個計時器會顯示 **"PTF"** 字樣。
    *   **裁判控制台 (`Edit.jsx`)**:
        *   會出現 **"🚀 Promote Winner"** 嘅按鈕。
        *   唔會顯示 "Start Round 3" 或者休息倒數。

---

### **Test Case 2: 「打和」後進入休息時間 (Rest Scenario)**

測試當雙方各贏一局，係咪會正確進入休息模式。

*   **模擬情景**: 紅方贏第一局，但藍方贏返第二局，總比分 1:1。
*   **操作步驟**:
    1.  **第一局**: 同上，紅方贏，裁判宣告紅方勝。
    2.  **第二局**:
        *   等60秒休息完，裁判撳 **"Start Round 2"**。
        *   今次係藍方佔優，贏咗第二局。
        *   裁判撳 **"Declare Round Winner"**，揀藍方。
*   **預期結果**:
    *   **計分板畫面 (`Screen.jsx`)**:
        *   背景會**變成黑色** (Rest Mode)，兩邊會顯示返之前每局嘅得分歷史。
        *   計時器會開始 **60秒倒數**。
    *   **裁判控制台 (`Edit.jsx`)**:
        *   會出現 **"Start Round 3"** 嘅按鈕。

---

### **Test Case 3: 顯示「上手勝方」 (Source Match Display)**

測試當一個比賽場次嘅選手係由另一個場次晉級上嚟，個名係咪會正確顯示。

*   **模擬情景**: 場次 "B201" 嘅紅方選手係由場次 "A100" 勝出晉級。
*   **操作步驟**:
    1.  直接喺 Firebase Database 度搵一個你準備用嚟測試嘅場次（例如 `B201`）。
    2.  將 `competitors.red.name` 同 `competitors.red.club` 兩個欄位清空 (set to `""`)。
    3.  同時，新增一個欄位 `competitors.red.previousMatch`，數值設定為 `"A100"`。
    4.  重新載入或者導航去 `B201` 場次嘅計分板畫面。
*   **預期結果**:
    *   **計分板畫面 (`Screen.jsx`)**:
        *   喺紅方選手嘅名牌位置，應該要顯示 **"Winner of A100"**。

---

### **Test Case 4: 驗證「晉級」功能 (Promote Winner)**

測試當一場比賽完結後，撳 "Promote Winner" 係咪可以將勝方嘅資料正確填入下一場比賽。

*   **模擬情景**: 跟返 Test Case 1，紅方 2:0 贏咗，然後裁判要將佢晉級去下一場（例如 `B201`）。
*   **操作步驟**:
    1.  完成 Test Case 1 嘅所有步驟，直到 "Promote Winner" 按鈕出現。
    2.  確認 Firebase入面，當前場次嘅 `config.nextMatchId` 已經設定好（例如 `"B201"`）。
    3.  撳 **"🚀 Promote Winner"** 按鈕。
*   **預期結果**:
    *   **檢查 Firebase Database**:
        *   去 `events/{eventName}/matches/B201` 呢個路徑。
        *   檢查 `competitors` 節點，其中一方（例如 `red`）嘅 `name` 同 `club` 應該已經被更新為啱啱贏咗嗰個紅方選手嘅資料。
        *   最重要嘅係，`B201` 場次原先可能存在嘅 `previousMatch` 欄位**必須保持不變**。
