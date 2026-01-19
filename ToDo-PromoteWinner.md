# 🚀 WT 跆拳道計分系統：晉級功能開發指南 (Tournament Progression)

此指南旨在實作「自動晉級」功能：當一場比賽結束（或分出勝負）時，裁判可一鍵將勝者資料傳送至下一場比賽的指定位置。

## 1. 資料導入邏輯 (`DataImport.jsx`)

**目標**：確保從 Excel/CSV 導入資料時，將來源場次映射為 JSON 中的 `previousMatch` 欄位。

請在 `src/Components/DataImport/DataImport.jsx` 修改資料處理部分：

```javascript
// 在處理每一行資料 (row) 時：
const competitorData = {
    name: row['Name'] || "",
    affiliatedClub: row['Club'] || "",
    
    // [重點修改] 確保 Key 為 'previousMatch'
    // 對應 Excel 內的 "Source Match" 或 "Previous Match" 欄位
    previousMatch: row['Source Match'] || row['Previous Match'] || "" 
};

// 預期生成的 Firebase JSON 結構範例：
/*
"A1010": {
  "config": {
    "competitors": {
      "red": {
        "name": "", 
        "previousMatch": "A1001" // <--- 用於顯示 "Winner of A1001"
      }
    }
  }
}
*/

'''

---

## 2. 前端顯示邏輯 (`src/Pages/Screen/Screen.jsx`)

**目標**：在選手未晉級前，顯示「Winner of [Previous Match]」作為佔位符。

請修改顯示選手名字的邏輯：

```javascript
// 定義 Helper Function (可放在 Component 內或外)
const renderCompetitorName = (compData) => {
    // A. 有人名 -> 顯示真實人名
    if (compData?.name && compData.name.trim() !== "") {
        return <div className="name-text">{compData.name}</div>;
    }
    
    // B. 無人名但有 previousMatch -> 顯示等待訊息
    if (compData?.previousMatch) {
        return (
            <div className="name-placeholder" style={{color: '#aaa', fontStyle: 'italic', fontSize: '0.8em'}}>
                Winner of {compData.previousMatch}
            </div>
        );
    }
    
    // C. 兩樣都無 -> 顯示待定
    return <div className="name-tbd">TBD</div>;
};

// --- 在 JSX 中使用 ---
/*
<div className="player-name">
    {renderCompetitorName(matchData?.config?.competitors?.red)}
</div>
*/

'''

---

## 3. 後端傳輸邏輯 (`src/Api.js`)

**目標**：將勝者的 `name` 和 `affiliatedClub` 寫入下一場比賽，**不可覆蓋**下一場原本設定好的 `previousMatch`。

請新增 `promoteWinner` 函數：

```javascript
import { ref, get, update } from "firebase/database";
import { db } from './firebase';

export const promoteWinner = async (eventName, currentMatchId, winnerSide) => {
    const matchRoot = `events/${eventName}/matches`;

    try {
        // 1. 讀取當前比賽 Config
        const snapshot = await get(ref(db, `${matchRoot}/${currentMatchId}/config`));
        const config = snapshot.val();
        if (!config) return;

        // 2. 取得勝者資料 & 下一場路徑
        const winnerData = config.competitors[winnerSide];
        const { nextMatchId, nextMatchSlot } = config; // e.g. "A1010", "red"

        if (!nextMatchId || !nextMatchSlot) {
            alert("此場次未設定下一場比賽路徑 (Next Match ID/Slot missing)");
            return;
        }

        // 3. 更新下一場 (只更新 Name & Club)
        const targetPath = `${matchRoot}/${nextMatchId}/config/competitors/${nextMatchSlot}`;
        
        await update(ref(db, targetPath), {
            name: winnerData.name,
            affiliatedClub: winnerData.affiliatedClub || ""
        });

        alert(`已成功晉級：
${winnerData.name} -> ${nextMatchId} (${nextMatchSlot})`);

    } catch (e) {
        console.error(e);
        alert(`晉級失敗: ${e.message}`);
    }
};

'''

---

## 4. 裁判控制介面 (`src/Components/Edit/Edit.jsx`)

**目標**：

1. 使用自定義 `<Button>` 組件。
2. 智能判斷按鈕顯示時機（直落兩局、決勝局打完、或手動結束時）。

```javascript
import React from 'react';
import { promoteWinner } from '../../Api';
import Button from '../Button/Button'; // [修改] 引入自定義 Button

const Edit = ({ eventName, matchId, matchData, visible }) => {
    // ... (保留原有的 Hooks) ...

    // --- 晉級邏輯開始 ---
    
    // 1. 獲取勝局數
    const stats = matchData?.stats;
    const redWins = stats?.roundWins?.[0] || 0;  // Index 0: Red
    const blueWins = stats?.roundWins?.[1] || 0; // Index 1: Blue

    // 2. 判斷暫時勝方 (誰局數多誰贏)
    const getWinner = () => {
        if (redWins > blueWins) return 'red';
        if (blueWins > redWins) return 'blue';
        return null; 
    };
    const winner = getWinner();

    // 3. 智能判斷：是否應該顯示晉級按鈕？
    // 條件 A: 數據庫已標記結束 (Manual Finish)
    const isFinishedDB = matchData?.state?.isFinished;
    // 條件 B: 任何一方贏得 2 局 (Best of 3 規則: 2-0 或 2-1)
    const isBestOf3Won = (redWins >= 2 || blueWins >= 2);
    // 條件 C: 第 3 回合結束且已分出勝負
    const isRound3Done = (matchData?.state?.currentRound === 3 && winner !== null && matchData?.state?.matchPhase === 'REST');

    // 只要滿足任一條件，即視為可晉級
    const shouldShowPromoteButton = isFinishedDB || isBestOf3Won || isRound3Done;

    // --- 晉級邏輯結束 ---

    return (
        <div className="edit-overlay">
            {/* ... 原有的分數控制 ... */}
            
            <hr style={{margin: '20px 0', borderColor: '#555'}} />

            {/* --- 晉級按鈕區 --- */}
            {shouldShowPromoteButton && winner && (
                <div style={{
                    textAlign: 'center', 
                    padding: '20px', 
                    border: '1px solid #4CAF50', 
                    borderRadius: '10px',
                    backgroundColor: 'rgba(76, 175, 80, 0.1)',
                    marginTop: '20px'
                }}>
                    <h2 style={{color: '#4CAF50', margin: '0 0 10px 0'}}>
                        🏆 最終勝方: {winner.toUpperCase()}
                    </h2>
                    
                    <div style={{fontSize: '1.2rem', marginBottom: '15px', color: '#ddd'}}>
                        局數比分: {redWins} - {blueWins}
                    </div>

                    {/* [修改] 使用自定義 Button */}
                    <Button 
                        onClick={() => promoteWinner(eventName, matchId, winner)}
                        style={{
                            backgroundColor: '#4CAF50', 
                            color: 'white',
                            fontSize: '1.2rem',
                            padding: '15px 30px',
                            width: '80%' // 讓按鈕寬一點
                        }}
                    >
                        🚀 確認並晉級勝者
                    </Button>
                    
                    <p style={{color: '#ccc', fontSize: '0.9rem', marginTop: '10px'}}>
                        晉級至: {matchData?.config?.nextMatchId} ({matchData?.config?.nextMatchSlot})
                    </p>
                </div>
            )}
        </div>
    );
};

export default Edit;

'''

---

## ✅ 功能驗證 Check List

1. **資料結構**: JSON 中的目標場次是否包含 `previousMatch: "Axxxx"`？
2. **顯示測試**: 在未晉級前，Screen 是否顯示 "Winner of Axxxx"？
3. **按鈕時機**:
* 試下 Red Win Round 1 -> Red Win Round 2 (2:0)，按鈕應自動出現。
* 試下 Red 1 : 1 Blue -> Red Win Round 3 (2:1)，按鈕應自動出現。


4. **傳輸測試**: 點擊按鈕後，檢查 Firebase，目標場次的 `name` 是否已更新，且 `previousMatch` 保持不變。
