import React from "react";
import ScreenRoundWins from "../Screen/ScreenRoundWins";

/**
 * Center column mirrors Screen match-info:
 * MATCH + scores (in place of timer/timeout) + Screen ROUND strip.
 */
export default function ControllerCenterPanel({
  redScore = 0,
  blueScore = 0,
  currentRound,
  isPaused = false,
  matchNo,
  roundWins = { red: 0, blue: 0 },
}) {
  const scoreColor = isPaused ? "#FFFFFF" : "var(--yellow-primary, #ffff00)";

  return (
    <div className="ctrl-col-info">
      <div className="match-info-middle">
        <div className="match">
          <div className="match-font">MATCH</div>
          <div className="match-number">{matchNo}</div>
        </div>
        <div className="timer">
          <div
            className="game-timer timer-font ctrl-center-scoreboard"
            style={{ color: scoreColor }}
          >
            <span className="ctrl-center-score" style={{ color: scoreColor }}>
              {redScore}
            </span>
            <span className="ctrl-center-score" style={{ color: scoreColor }}>
              {blueScore}
            </span>
          </div>
        </div>
      </div>

      <ScreenRoundWins
        direction="row"
        roundWins={roundWins}
        currentRound={currentRound}
      />
    </div>
  );
}
