import React from "react";
import { formatRefereeModeBadge } from "./controllerMatchView";

/**
 * Center info column (Screen match-info width): MATCH + scores
 * instead of timer/timeout. Names stay here (no Screen top-name strip).
 */
export default function ControllerCenterPanel({
  redName,
  blueName,
  redScore = 0,
  blueScore = 0,
  currentRound,
  isPaused,
  refereeMode,
  mySeat,
  matchNo,
}) {
  return (
    <div className="match-info-middle ctrl-col-info">
      <div className="match">
        <div className="match-font">MATCH</div>
        <div className="match-number">{matchNo}</div>
      </div>
      <div className="timer">
        <div className="game-timer timer-font ctrl-center-scoreboard">
          <span className="ctrl-center-score ctrl-center-score--red">
            {redScore}
          </span>
          <span className="ctrl-center-score ctrl-center-score--blue">
            {blueScore}
          </span>
        </div>
        <div className="ctrl-center-status">
          <div className="ctrl-center-names">
            <span className="ctrl-center-name-red" title={redName}>
              {redName}
            </span>
            <span className="ctrl-center-name-sep">·</span>
            <span className="ctrl-center-name-blue" title={blueName}>
              {blueName}
            </span>
          </div>
          <div>
            R{currentRound} • {isPaused ? "PAUSED" : "LIVE"}
          </div>
          <div className="ctrl-center-status-sub">
            {formatRefereeModeBadge(refereeMode)} • {mySeat || "..."}
          </div>
        </div>
      </div>
    </div>
  );
}
