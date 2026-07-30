# TKD-scoreboard 跆拳道多裝置實時互動與裁判搶位系統設計文件
(TKD-scoreboard Multi-device Real-time Interaction & Referee Slot Machine Design Document)

## 1. 系統概述 (System Overview)
本系統專為 **TKD Scoreboard (跆拳道計分系統)** 打造，旨在透過 Firebase Realtime Database (實時資料庫) 實現電腦端 Host (主機端，即比賽大螢幕 Screen / 場地管理 CourtSetup) 與最多 3 部手機端 Client (客戶端，即 Corner Judge / 角裁控制器 Controller) 之間的低延遲實時互動與狀態同步。

系統支援：
- **Dynamic QR Code Generation (動態二維碼生成)**：Host 根據 `eventId` (賽事識別碼) 與 `courtId` (場地識別碼) 產生包含專屬網址的 QR Code (二維碼)。
- **Slot-based State Machine (基於席位嘅狀態機)**：每座 Court (場地) 設有 `J1`、`J2`、`J3` 三個固定 Corner Judge (角裁) 席位。
- **Atomic Transaction (原子事務) 搶位**：防範多部手機同時掃碼引致的 Race Condition (競態條件)。
- **Automatic Disconnect Recovery (自動斷線修復)**：透過 `onDisconnect()` Hook (斷線鉤子) 自動釋放離線裁判的席位。
- **Persistent Token (持久化權杖)**：結合 Local Storage (本地儲存)，防止手機重載網頁時丟失裁判身分。

---

## 2. 資料庫架構與專案對接 (Database Schema & Repository Integration)
於 Firebase Realtime Database (實時資料庫) 的 `events/{eventId}/courts/{courtId}` 節點下建立 `referees` (裁判席位) 狀態區塊，與現有的 `matches` 賽事數據分開存取，確保 Namespace Isolation (命名空間隔離)：

```json
{
  "events": {
    "2026-TKD-Open": {
      "courts": {
        "Court1": {
          "name": "Court 1",
          "currentMatchId": "M101",
          "hostStatus": "online",
          "referees": {
            "J1": {
              "clientId": "judge_client_uuid_881",
              "status": "occupied",
              "token": "token_secret_111",
              "lastSeen": 1770000000
            },
            "J2": {
              "clientId": null,
              "status": "vacant",
              "token": null,
              "lastSeen": null
            },
            "J3": {
              "clientId": "judge_client_uuid_992",
              "status": "occupied",
              "token": "token_secret_333",
              "lastSeen": 1770000010
            }
          }
        }
      },
      "matches": {
        "M101": {
          "config": {
            "matchId": "M101",
            "competitors": {
              "red": { "name": "Hong (Red)" },
              "blue": { "name": "Chung (Blue)" }
            }
          },
          "state": {
            "currentRound": 1,
            "isPaused": true
          },
          "stats": {
            "red": { "pointsStat": [0,0,0,0,0], "gamjeom": 0 },
            "blue": { "pointsStat": [0,0,0,0,0], "gamjeom": 0 }
          }
        }
      }
    }
  }
}
```

---

## 3. 核心運作邏輯 (Core Operation Logic)

```
[Corner Judge 手機]                      [Firebase Realtime Database]                     [Host 大螢幕 / Screen]
       |                                              |                                           |
       |--- 掃描 QR Code 進入 Controller ------------->|                                           |
       |    (?event=2026-TKD-Open&court=Court1)       |                                           |
       |                                              |                                           |
       |--- 檢查 Local Storage 有無 Token ------------>|                                           |
       |    - 無：執行 runTransaction() 尋找 vacant    |                                           |
       |    - 有：帶入 Token 進行驗證與續期            |                                           |
       |                                              |                                           |
       |<-- 搶位成功：獲派發 J1 及 Token -------------|                                           |
       |    並註冊 onDisconnect() 鉤子                 |--- 觸發 referees 監聽器 ----------------->|
       |                                              |    更新裁判人數 (例如: 2/3)                 |
       |                                              |                                           |
       |--- 按下按鈕得分 (updateScoreAndCheckRules) -->|--- 實時同步比賽數據 --------------------->|
       |                                              |    大螢幕實時更新紅藍分數                 |
       |                                              |                                           |
       |--- 手機離線 / 關閉瀏覽器 ------------------->|                                           |
       |    (Firebase 自動執行 onDisconnect)          |--- 席位設回 vacant ---------------------->|
       |                                              |    大螢幕更新為 (1/3)，釋放席位           |
```

### 3.1 搶位與鎖定 (Atomic Transaction)
手機掃碼連線時，前端發起 `runTransaction()` 針對 `events/{eventId}/courts/{courtId}/referees` 進行寫入：
1. 遍歷 `J1`, `J2`, `J3` 席位。
2. 找出第一個 `status === 'vacant'` 的席位。
3. 生成獨一無二的 `clientId` 與 `token`。
4. 將該席位更新為 `occupied` 並回傳成功。若 3 個席位皆為 `occupied`，回傳滿額警告。

### 3.2 自動斷線釋放 (Disconnect Hook)
成功佔據席位後，手機端執行：
```javascript
const slotRef = ref(database, `events/${eventId}/courts/${courtId}/referees/${assignedSlot}`);
onDisconnect(slotRef).update({
  status: "vacant",
  clientId: null,
  token: null
});
```

### 3.3 重新整理恢復 (Reconnection & Persistence)
手機端連線時先檢查 `localStorage.getItem("tkd_judge_session")`：
- 若存在包含 `{ eventId, courtId, slot, token }` 的 Local Storage (本地儲存) 記錄，系統發起驗證請求。
- 若該 Slot (席位) 的 Token (權杖) 與紀錄相符，即使狀態目前標記為離線，亦可直接重連並鎖定該席位，無需重新搶位。

---

## 4. 模組實作指南 (Module Implementation Guide)

### 4.1 Host 主機端與 QR Code (Screen.jsx / QRCodeDisplay.jsx)
- **檔案**: `src/Components/QRCodeDisplay/QRCodeDisplay.jsx`
- **邏輯**: 產生的控制器連結格式為：
  `${window.location.origin}${basePath}controller?event=${eventId}&court=${courtId}`
- **畫面回饋**: 在 [Screen.jsx](file:///c:/Users/cyche/Document/TKD-scoreboard/src/Pages/Screen/Screen.jsx) 畫面上加入 Referee Badge (裁判狀態標籤)，顯示目前 `J1`, `J2`, `J3` 的在線狀態。

### 4.2 Client 裁判端 (Controller.jsx)
- **檔案**: `src/Pages/Controller/Controller.jsx`
- **邏輯**: 
  - 進入頁面時初始化席位申請。
  - 頂端 Bar 顯示當前裁判身分（例如 `[Judge J1]`）。
  - 按下得分按鈕時，呼叫 `src/Api.js` 中的 `updateScoreAndCheckRules(eventId, currentMatchId, side, type, index, delta)` 進行賽分更新。

### 4.3 Firebase Security Rules (安全規則)
寫入 `firebase.json` 或 Firebase 控制台：
```json
{
  "rules": {
    "events": {
      "$eventId": {
        "courts": {
          "$courtId": {
            "referees": {
              ".read": true,
              ".write": true
            }
          }
        },
        "matches": {
          ".read": true,
          ".write": true
        }
      }
    }
  }
}
```

---

## 5. 邊緣情況與容錯機制 (Edge Cases & Error Handling)

1. **滿額掃描 (Full Slot Handling)**：
   若 3 位裁判已滿，第 4 位掃碼者會收到彈出提示：「目前裁判席位已滿 (3/3 All Referees Occupied)，請稍後再試或聯絡大會主裁。」
2. **大螢幕 Host 離線 (Host Disconnect)**：
   當大螢幕關閉時，`courts/{courtId}/hostStatus` 被設為 `offline`。裁判手機會顯示橙色警示巴：「與大螢幕失去同步 (Host Disconnected)」，但仍可暫存本地得分指令。
3. **誤關網頁與快速重連 (Accidental Refresh)**：
   裁判如果不小心 Refresh (重新整理) 瀏覽器，可在 3 秒之內透過 Persistent Token (持久化權杖) 無縫恢復原本位置，其他裁判不會被強行剔除。

---
*文件建立日期: 2026-07-30*  
*專案名稱: TKD-scoreboard*
