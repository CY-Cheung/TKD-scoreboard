import React from "react";
import ScreenRoundWins from "../Screen/ScreenRoundWins";
import {
  formatControllerJudgeLabel,
  formatControllerModeLabel,
} from "./controllerMatchView";

/**
 * Center column: MATCH + mode/judge in a Screen-sized .game-timer + ROUND.
 * Yellow box matches Screen timer: same .game-timer.timer-font + hidden "0:00"
 * sizer (Inter metrics; Mode/Judge overlay stays Controller Arial).
 */
export default function ControllerCenterPanel({
  currentRound,
  matchNo,
  roundWins = { red: 0, blue: 0 },
  refereeMode = "single",
  mySeat,
  isConnected = true,
}) {
  return (
    <div className="ctrl-col-info">
      <div className="match-info-middle">
        <div className="match">
          <div className="match-font">MATCH</div>
          <div className="match-number">{matchNo}</div>
        </div>
        <div className="timer">
          <div className="game-timer timer-font ctrl-center-seat-stack">
            <span className="ctrl-timer-height-ref" aria-hidden="true">
              0:00
            </span>
            <div className="ctrl-center-seat-fore">
              <div className="ctrl-center-mode">
                {formatControllerModeLabel(refereeMode)}
              </div>
              <div className="ctrl-center-judge">
                {formatControllerJudgeLabel(mySeat, isConnected)}
              </div>
            </div>
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
