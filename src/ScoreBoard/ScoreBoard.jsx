import React, { useState, useEffect } from 'react';
import './ScoreBoard.css'

function ScoreBoard() {
    const [timeoutActive, setTimeoutActive] = useState(false);

    const handleTimeoutClick = () => {
        setTimeoutActive((prev) => !prev);
    };

    // 按下空白鍵時觸發 handleTimeoutClick
    useEffect(() => {
        const handleSpacebar = (e) => {
            if (e.code === 'Space') {
                handleTimeoutClick();
            }
        };
        window.addEventListener('keydown', handleSpacebar);
        return () => window.removeEventListener('keydown', handleSpacebar);
    }, []);

    return (
        <div className="scoreboard">    
            <div className="scoreboard-display">
                <div className="top">
                    <div className="red-name red-bg name-font">Red Player</div>
                    <div className="blue-name blue-bg name-font">Blue Player</div>
                </div>
                <div className="midbottom">
                    <div className="red-log red-bg">
                        <div className="red-ref-log red-bg">
                            <div>X</div>
                            <div>O</div>
                            <div>O</div>
                            <div>O</div>
                        </div>
                        <div className="red-gamjeom red-bg">
                            <div className="gamjeom-font">GAM-JEOM</div>
                            <div className="gamjeom-number">0</div>
                        </div>
                    </div>
                    <div className="red-score red-bg">
                        <div className="red-score-text red-score-bg score-font">0</div>
                        <div className="red-score-info red-bg"></div>
                    </div>
                    <div className="match-info">
                        <div className="match-number match-font">
                            <div>MATCH</div>
                            <div>A1001</div>
                        </div>
                        <div className="timer timer-font">2:00</div>
                        <div
                          className={`time-out match-font${timeoutActive ? ' timeout-active' : ''}`}
                          onClick={handleTimeoutClick}
                          style={{
                            backgroundColor: timeoutActive ? '#000000' : '#FFFF00',
                            cursor: 'pointer'
                          }}
                        >
                          Time out
                        </div>
                        <div className="round match-font">
                            <div>ROUND</div>
                            <div>1</div>
                        </div>
                    </div>
                    <div className="blue-score blue-bg">
                        <div className="blue-score-text blue-score-bg score-font">0</div>
                        <div className="blue-score-info blue-bg"></div>
                    </div>
                    <div className="blue-log blue-bg">
                        <div className="blue-ref-log blue-bg">
                            <div>X</div>
                            <div>O</div>
                            <div>O</div>
                            <div>O</div>
                        </div>
                        <div className="blue-gamjeom blue-bg">
                            <div className="gamjeom-font">GAM-JEOM</div>
                            <div className="gamjeom-number">0</div>
                        </div>
                    </div>
                </div>
            </div>
            <div className="scoreboard-menu">Menu</div>
        </div>
    )
}

export default ScoreBoard