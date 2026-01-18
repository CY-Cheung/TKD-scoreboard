// src/Api.js
import { ref, runTransaction } from "firebase/database";
import { database } from './firebase'; // Use 'database' as per project setup

/**
 * 輔助函數：計算總分
 * [修正] 加入 Index 3 (4分) 和 Index 4 (5分) 的計算
 */
const calculateTotal = (pointsStat, opponentGamjeom) => {
    // Index 對照表: 0=1分, 1=2分, 2=3分, 3=4分, 4=5分
    const p1 = (pointsStat?.[0] || 0) * 1;
    const p2 = (pointsStat?.[1] || 0) * 2;
    const p3 = (pointsStat?.[2] || 0) * 3;
    const p4 = (pointsStat?.[3] || 0) * 4; // [修正] 補回 4 分
    const p5 = (pointsStat?.[4] || 0) * 5; // [修正] 補回 5 分
    
    const gamjeomPoints = (opponentGamjeom || 0);
    
    return p1 + p2 + p3 + p4 + p5 + gamjeomPoints;
};

/**
 * 主函數：更新分數並執行自動裁決 (PTG/PUN)
 */
export const updateScoreAndCheckRules = (eventName, matchId, side, type, index, delta) => {
    const matchRef = ref(database, `events/${eventName}/matches/${matchId}`);

    runTransaction(matchRef, (matchData) => {
        if (!matchData) return;

        // 1. 初始化結構 (防呆機制：確保長度為 5)
        if (!matchData.stats) matchData.stats = { 
            red: { pointsStat: [0,0,0,0,0], gamjeom: 0 }, 
            blue: { pointsStat: [0,0,0,0,0], gamjeom: 0 } 
        };
        if (!matchData.state) matchData.state = { 
            isFinished: false, isPaused: true, timer: 0, winReason: null, lastStartTime: null 
        };

        // 2. 執行加減分操作
        const targetSide = matchData.stats[side];
        
        if (type === 'gamjeom') {
            targetSide.gamjeom = (targetSide.gamjeom || 0) + delta;
            if (targetSide.gamjeom < 0) targetSide.gamjeom = 0;
        } else if (type === 'pointsStat') {
            // [修正] 確保陣列長度足夠，防止 undefined 錯誤
            if (!targetSide.pointsStat || targetSide.pointsStat.length < 5) {
                 const oldStats = targetSide.pointsStat || [];
                 targetSide.pointsStat = [
                    oldStats[0] || 0, oldStats[1] || 0, oldStats[2] || 0,
                    oldStats[3] || 0, oldStats[4] || 0 // 補齊
                 ];
            }
            targetSide.pointsStat[index] = (targetSide.pointsStat[index] || 0) + delta;
            if (targetSide.pointsStat[index] < 0) targetSide.pointsStat[index] = 0;
        }

        // 3. 獲取最新數值
        const redGamjeom = matchData.stats.red.gamjeom;
        const blueGamjeom = matchData.stats.blue.gamjeom;
        const redScore = calculateTotal(matchData.stats.red.pointsStat, blueGamjeom);
        const blueScore = calculateTotal(matchData.stats.blue.pointsStat, redGamjeom);

        // 4. 定義：凍結時間函數 (Snapshot Timer)
        const freezeTimer = () => {
            // 只有在比賽進行中才需要結算時間
            if (!matchData.state.isPaused && matchData.state.lastStartTime) {
                const now = Date.now();
                const elapsed = Math.floor((now - matchData.state.lastStartTime) / 1000);
                
                // 更新 DB 中的 timer 為當前剩餘時間
                matchData.state.timer = (matchData.state.timer || 0) - elapsed;
                if (matchData.state.timer < 0) matchData.state.timer = 0;
            }
            // 強制設定為暫停 & 結束
            matchData.state.isPaused = true;
            matchData.state.lastStartTime = null;
            matchData.state.isFinished = true;
        };

        // 5. 規則引擎 (Rule Engine)
        const maxGap = matchData.config?.rules?.maxPointGap || 12; // 動態讀取規則
        const maxGJ = matchData.config?.rules?.maxGamjeom || 5;     // 動態讀取規則

        const isPUN = redGamjeom >= maxGJ || blueGamjeom >= maxGJ;
        const isPTG = Math.abs(redScore - blueScore) >= maxGap;

        if (isPUN) {
            freezeTimer(); // [關鍵] 先結算時間
            matchData.state.winReason = 'PUN';
        } 
        else if (isPTG) {
            freezeTimer(); // [關鍵] 先結算時間
            matchData.state.winReason = 'PTG';
        } 
        else {
            // [復活檢查]
            // 如果當前分數正常，但狀態卻是 PTG/PUN (代表之前誤判)，則執行復活
            if (matchData.state.winReason === 'PTG' || matchData.state.winReason === 'PUN') {
                console.log("Auto-Resurrection: Clearing PTG/PUN status");
                matchData.state.isFinished = false; // 解鎖
                matchData.state.winReason = null;   // 清空原因
                // timer 不用動，因為 freezeTimer 剛才已經存好了正確的剩餘時間
            }
        }

        return matchData;
    })
    .catch((err) => console.error("Transaction failed:", err));
};
