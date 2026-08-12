import React from "react";
import { formatTime } from "./formatTime";
import { getTimeoutStyle } from "./getTimeoutStyle";

/**
 * Presentational center MATCH + timer / kye-shi block.
 * Does not own rAF or Firebase timer writes — parent passes handlers.
 */
export default function ScreenCenterTimer({
  matchNumber,
  kyeShiRemaining,
  displayTime,
  winReason,
  isPaused,
  isResting,
  isMatchLoaded,
  timerColor,
  onToggleDirection,
  onToggleTimer,
}) {
  const timeoutStyle = getTimeoutStyle({ isMatchLoaded, isPaused, isResting });

  const timerContent = () => {
    if (winReason) return winReason;
    if (!isMatchLoaded) return "0:00";
    return formatTime(displayTime);
  };

  return (
    <div className="match-info-middle">
      <div className="match cursor-target" onClick={onToggleDirection}>
        <div className="match-font">MATCH</div>
        <div className="match-number">{matchNumber}</div>
      </div>
      <div className="timer cursor-target">
        {kyeShiRemaining !== null ? (
          <>
            <div
              className="time-out match-font timeout-active"
              onClick={onToggleTimer}
              style={{ backgroundColor: "#FFFF00", color: "#000000" }}
            >
              Kye-shi
            </div>
            <div
              className="game-timer timer-font"
              onClick={onToggleTimer}
              style={{ color: "#FFFF00" }}
            >
              {`${Math.floor(kyeShiRemaining / 60)}:${(kyeShiRemaining % 60)
                .toString()
                .padStart(2, "0")}`}
            </div>
          </>
        ) : (
          <>
            <div
              className="game-timer timer-font"
              onClick={onToggleTimer}
              style={{ color: timerColor }}
            >
              {timerContent()}
            </div>
            <div
              className={`time-out match-font ${
                isMatchLoaded && !isPaused ? "timeout-active" : ""
              } ${isResting ? "rest-mode" : ""}`}
              onClick={onToggleTimer}
              style={timeoutStyle}
            >
              {isResting ? "REST TIME" : "Time out"}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
