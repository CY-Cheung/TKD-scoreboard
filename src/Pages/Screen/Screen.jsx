import React, { useState, useEffect } from "react";
import "./Screen.css";
import "./Edit.css";
import Edit from "./Edit";

function Screen() {
    const [timeoutActive, setTimeoutActive] = useState(true);
    const [direction, setDirection] = useState("row");
    const [showEdit, setShowEdit] = useState(false);

    // --- 計分邏輯 (建議未來可以抽離到獨立的 logic 檔案) ---
    // 目前先保留你的 scoreArray 結構，但實務上這通常會放在 useState 中
    const scoreArray = [
        [0, 0, 0, 0, 0, 0], // Red 隊伍資料
        [0, 0, 0, 0, 0, 0], // Blue 隊伍資料
    ];

    const blueScore = (arr) => (
        arr[0][1] * 1 + arr[0][2] * 2 + arr[0][3] * 3 + arr[0][4] * 4 + arr[0][5] * 5 + arr[1][0]
    );

    const redScore = (arr) => (
        arr[1][1] * 1 + arr[1][2] * 2 + arr[1][3] * 3 + arr[1][4] * 4 + arr[1][5] * 5 + arr[0][0]
    );

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
                e.preventDefault(); // 防止空白鍵捲動頁面
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

    return (
        <>
            <div
                className="screen"
                onClick={() => document.documentElement.requestFullscreen()}
            >
                {/* 頂部選手名稱 */}
                <div className="top" style={{ flexDirection: direction }}>
                    <div className="red-name red-bg name-font cursor-target">
                        Red Player
                    </div>
                    <div className="blue-name blue-bg name-font cursor-target">
                        Blue Player
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
                            {/* 這裡可以考慮將 log-row 寫成一個小元件來減少重複程式碼 */}
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
                            <div className="gamjeom-number">{scoreArray[1][0]}</div>
                        </div>
                    </div>

                    <div className="red-score red-bg">
                        <div className="red-score-text red-score-bg score-font cursor-target" onClick={() => setShowEdit(true)}>
                            {redScore(scoreArray)}
                        </div>
                        <div className="red-score-info red-bg"></div>
                    </div>

                    {/* 中央比賽資訊 */}
                    <div className="match-info">
                        <div className="match cursor-target" onClick={toggleDirection}>
                            <div className="match-font">MATCH</div>
                            <div className="match-number">A1001</div>
                        </div>
                        <div className="timer">
                            <div
                                className={`game-timer timer-font cursor-target ${timeoutActive ? " timeout-active" : ""}`}
                                onClick={handleTimeoutClick}
                                style={{
                                    color: timeoutActive ? "#FFFFFF" : "#FFFF00",
                                    cursor: "pointer",
                                }}
                            >
                                2:00
                            </div>
                            <div
                                className={`time-out match-font cursor-target ${timeoutActive ? " timeout-active" : ""}`}
                                onClick={handleTimeoutClick}
                                style={{
                                    backgroundColor: timeoutActive ? "#000000" : "#FFFF00",
                                    cursor: "pointer",
                                }}
                            >
                                Time out
                            </div>
                        </div>
                        <div className="round-info">
                            <div className="round-font">ROUND</div>
                            <div className="round-number">1</div>
                        </div>
                    </div>

                    {/* 藍方區塊 */}
                    <div className="blue-score blue-bg">
                        <div className="blue-score-text blue-score-bg score-font cursor-target" onClick={() => setShowEdit(true)}>
                            {blueScore(scoreArray)}
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
                            <div className="gamjeom-number">{scoreArray[0][0]}</div>
                        </div>
                    </div>
                </div>
            </div>
            
            <Edit visible={showEdit} setVisible={setShowEdit} />
        </>
    );
}

export default Screen;