import React from "react";
import ScreenRoundWins from "../Screen/ScreenRoundWins";
import {
  formatControllerJudgeLabel,
  formatControllerModeLabel,
} from "./controllerMatchView";

/**
 * Center column: MATCH + mode/judge (Screen timer-sized box) + ROUND.
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
          <div className="game-timer ctrl-center-seat-stack">
            {/* Same intrinsic height driver as Screen countdown */}
            <span className="timer-font ctrl-timer-height-ref" aria-hidden="true">
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
          <div
            className="time-out match-font ctrl-timeout-spacer"
            aria-hidden="true"
          >
            Time out
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
