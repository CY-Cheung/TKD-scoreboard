import React from "react";
import ScreenRoundWins from "../Screen/ScreenRoundWins";
import {
  formatControllerJudgeLabel,
  formatControllerModeLabel,
} from "./controllerMatchView";

/**
 * Center column: MATCH + mode/judge stack (replaces scores) + ROUND strip.
 */
export default function ControllerCenterPanel({
  currentRound,
  matchNo,
  roundWins = { red: 0, blue: 0 },
  refereeMode = "single",
  mySeat,
}) {
  return (
    <div className="ctrl-col-info">
      <div className="match-info-middle">
        <div className="match">
          <div className="match-font">MATCH</div>
          <div className="match-number">{matchNo}</div>
        </div>
        <div className="timer">
          <div className="game-timer ctrl-center-seat-stack">
            <div className="ctrl-center-mode">
              {formatControllerModeLabel(refereeMode)}
            </div>
            <div className="ctrl-center-judge">
              {formatControllerJudgeLabel(mySeat)}
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
