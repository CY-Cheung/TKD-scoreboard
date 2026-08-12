import React from "react";
import { RecordCircle } from "react-bootstrap-icons";

/**
 * Bottom-center ROUND number with left/right win marks (respects board direction).
 */
export default function ScreenRoundWins({ direction, roundWins, currentRound }) {
  const wins =
    roundWins && typeof roundWins === "object"
      ? roundWins
      : { red: 0, blue: 0 };
  const leftWins = direction === "row" ? wins.red || 0 : wins.blue || 0;
  const rightWins = direction === "row" ? wins.blue || 0 : wins.red || 0;

  return (
    <div className="match-info-bottom">
      <div className="round-info">
        <div className="match-font">ROUND</div>
        <div className="round-number-row">
          <div
            className="round-win-marks round-win-marks--left"
            aria-label={`${direction === "row" ? "Red" : "Blue"} round wins`}
          >
            {Array.from({
              length: Math.max(0, Math.min(2, leftWins)),
            }).map((_, i) => (
              <RecordCircle
                key={`left-win-${i}`}
                className="round-win-icon"
                aria-hidden
              />
            ))}
          </div>
          <div className="round-number">{currentRound}</div>
          <div
            className="round-win-marks round-win-marks--right"
            aria-label={`${direction === "row" ? "Blue" : "Red"} round wins`}
          >
            {Array.from({
              length: Math.max(0, Math.min(2, rightWins)),
            }).map((_, i) => (
              <RecordCircle
                key={`right-win-${i}`}
                className="round-win-icon"
                aria-hidden
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
