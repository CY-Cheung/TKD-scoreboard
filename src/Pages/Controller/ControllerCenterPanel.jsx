import React from "react";
import { formatRefereeModeBadge } from "./controllerMatchView";

/**
 * Center info column: names, big red/blue scores (Screen-like),
 * round/status, judge/mode, court/match meta. Display only.
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
  eventLabel,
  courtId,
  matchNo,
}) {
  return (
    <div className="col center-col">
      <div className="center-match-stack">
        <div className="center-names-row">
          <div className="competitor-side red-side-text" title={redName}>
            {redName}
          </div>
          <div className="competitor-side blue-side-text" title={blueName}>
            {blueName}
          </div>
        </div>

        <div className="center-scores-row">
          <div className="center-score-box red-score-box">{redScore}</div>
          <div className="center-score-box blue-score-box">{blueScore}</div>
        </div>

        <div className="center-status-block">
          <div className="center-status-line">
            R{currentRound} • {isPaused ? "PAUSED" : "LIVE"}
          </div>
          <div className="center-status-line center-judge-line">
            {formatRefereeModeBadge(refereeMode)} • {mySeat || "..."}
          </div>
          <div className="center-meta-line" title={eventLabel || ""}>
            {eventLabel || "No Event"}
          </div>
          <div className="center-meta-line">
            {courtId || "No Court"} · Match #{matchNo}
          </div>
        </div>
      </div>
    </div>
  );
}
