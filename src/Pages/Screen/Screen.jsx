import React, { useState, useEffect } from "react";
import { ref, onValue } from "firebase/database";
import { database } from "../../firebase"; // 引入我們設定好的 database 物件
import "./Screen.css";
import "./Edit.css";
import Edit from "./Edit";

function Screen() {
    const [gameData, setGameData] = useState(null); // 用來儲存從 Firebase 讀取的整包遊戲資料
    const [timeoutActive, setTimeoutActive] = useState(true);
    const [direction, setDirection] = useState("row");
    const [showEdit, setShowEdit] = useState(false);

    // --- Firebase 資料監聽 ---
    useEffect(() => {
        // 建立一個指向 'court1' 的引用
        const courtRef = ref(database, 'court1');

        // 設定監聽器，當 'court1' 的資料有變化時，會觸發回呼函式
        const unsubscribe = onValue(courtRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                setGameData(data); // 將整包資料存到 state 中
            }
        });

        // Cleanup 函式：當元件卸載時，取消監聽
        return () => unsubscribe();
    }, []); // 空陣列確保 effect 只在元件掛載時執行一次

    // --- 事件處理 ---
    const handleTimeoutClick = () => {
        setTimeoutActive((prev) => !prev);
    };

    const toggleDirection = () => {
        setDirection((prev) => (prev === "row" ? "row-reverse" : "row"));
    };

    // 鍵盤快捷鍵監聽
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.code === "Space") {
                e.preventDefault();
                handleTimeoutClick();
            }
            if (e.key === "\\") {
                toggleDirection();
            }
            if (e.key === "e" || e.key === "E") {
                setShowEdit((prev) => !prev);
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);

    // 從 gameData state 中取得要顯示的資料，如果 gameData 還沒載入，就提供預設值
    const redPlayerName = gameData?.info?.red || "Red Player";
    const bluePlayerName = gameData?.info?.blue || "Blue Player";
    const redTotalScore = gameData?.score?.red?.total || 0;
    const blueTotalScore = gameData?.score?.blue?.total || 0;
    const redGamJeom = gameData?.score?.red?.['gam-jeom'] || 0;
    const blueGamJeom = gameData?.score?.blue?.['gam-jeom'] || 0;
    const matchNumber = gameData?.info?.match || "A1001";
    const roundNumber = gameData?.status?.round || 1;
    const timer = gameData?.status?.time || "2:00";


    return (
        <>
            <div
                className="screen"
                onClick={() => document.documentElement.requestFullscreen()}
            >
                {/* 頂部選手名稱 */}
                <div className="top" style={{ flexDirection: direction }}>
                    <div className="red-name red-bg name-font cursor-target">
                        {redPlayerName}
                    </div>
                    <div className="blue-name blue-bg name-font cursor-target">
                        {bluePlayerName}
                    </div>
                </div>

                {/* 中間主計分區 */}
                <div
                    className="midbottom"
                    style={{ flexDirection: direction, display: "flex" }}
                >
                    {/* 紅方區塊 */}
                    <div className="red-log red-bg">
                        <div className="red-ref-log red-bg">
                            {[128074, 129355, 12686].map((icon, idx) => (
                                <div className="log-row" key={idx}>
                                    <div className="log-icon">{String.fromCodePoint(icon)}</div>
                                    <div className="ref-num">1</div>
                                    <div className="ref-num">2</div>
                                    <div className="ref-num">3</div>
                                </div>
                            ))}
                        </div>
                        <div className="red-gamjeom red-bg cursor-target" onClick={() => setShowEdit(true)}>
                            <div className="gamjeom-font">GAM-JEOM</div>
                            <div className="gamjeom-number">{redGamJeom}</div>
                        </div>
                    </div>

                    <div className="red-score red-bg">
                        <div className="red-score-text red-score-bg score-font cursor-target" onClick={() => setShowEdit(true)}>
                            {redTotalScore}
                        </div>
                        <div className="red-score-info red-bg"></div>
                    </div>

                    {/* 中央比賽資訊 */}
                    <div className="match-info">
                        <div className="match cursor-target" onClick={toggleDirection}>
                            <div className="match-font">MATCH</div>
                            <div className="match-number">{matchNumber}</div>
                        </div>
                        <div className="timer">
                            <div
                                className={`game-timer timer-font cursor-target ${timeoutActive ? " timeout-active" : ""}`}
                                onClick={handleTimeoutClick}
                                style={{ color: timeoutActive ? "#FFFFFF" : "#FFFF00" }}
                            >
                                {timer}
                            </div>
                            <div
                                className={`time-out match-font cursor-target ${timeoutActive ? " timeout-active" : ""}`}
                                onClick={handleTimeoutClick}
                                style={{ backgroundColor: timeoutActive ? "#000000" : "#FFFF00" }}
                            >
                                Time out
                            </div>
                        </div>
                        <div className="round-info">
                            <div className="round-font">ROUND</div>
                            <div className="round-number">{roundNumber}</div>
                        </div>
                    </div>

                    {/* 藍方區塊 */}
                    <div className="blue-score blue-bg">
                        <div className="blue-score-text blue-score-bg score-font cursor-target" onClick={() => setShowEdit(true)}>
                            {blueTotalScore}
                        </div>
                        <div className="blue-score-info blue-bg"></div>
                    </div>

                    <div className="blue-log blue-bg">
                        <div className="blue-ref-log blue-bg">
                            {[128074, 129355, 12686].map((icon, idx) => (
                                <div className="log-row" key={idx}>
                                    <div className="log-icon">{String.fromCodePoint(icon)}</div>
                                    <div className="ref-num">1</div>
                                    <div className="ref-num">2</div>
                                    <div className="ref-num">3</div>
                                </div>
                            ))}
                        </div>
                        <div className="blue-gamjeom blue-bg cursor-target" onClick={() => setShowEdit(true)}>
                            <div className="gamjeom-font">GAM-JEOM</div>
                            <div className="gamjeom-number">{blueGamJeom}</div>
                        </div>
                    </div>
                </div>
            </div>
            
            <Edit visible={showEdit} setVisible={setShowEdit} />
        </>
    );
}

export default Screen;