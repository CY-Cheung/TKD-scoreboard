import React from "react";
import { formatRefereeModeBadge } from "./controllerMatchView";

/** Center VS / round / mode panel between score columns. */
export default function ControllerCenterPanel({
  redName,
  blueName,
  currentRound,
  isPaused,
  refereeMode,
  mySeat,
}) {
  return (
    <div className="col center-col">
      <div className="center-match-details-horizontal">
        <div className="competitor-side red-side-text">{redName}</div>
        <div className="center-vs-box">
          <span className="vs-badge">VS</span>
          <span className="round-pill">
            R{currentRound} • {isPaused ? "PAUSED" : "LIVE"}
          </span>
          <span
            className="round-pill"
            style={{
              fontSize: "1cqi",
              opacity: 0.8,
              background:
                refereeMode === "multiple"
                  ? "rgba(255,100,0,0.4)"
                  : "rgba(0,200,100,0.3)",
            }}
          >
            {formatRefereeModeBadge(refereeMode)} • {mySeat || "..."}
          </span>
        </div>
        <div className="competitor-side blue-side-text">{blueName}</div>
      </div>
    </div>
  );
}
