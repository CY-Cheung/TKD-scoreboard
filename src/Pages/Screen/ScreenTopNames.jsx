import React from "react";
import PlayerNameCell from "./PlayerNameCell";

/** Top red/blue name strip. */
export default function ScreenTopNames({
  direction,
  isResting,
  redCompetitor,
  blueCompetitor,
}) {
  return (
    <div
      className={`top ${isResting ? "rest-mode" : ""}`}
      style={{ flexDirection: direction }}
    >
      <div className="red-name red-bg name-font">
        <PlayerNameCell competitor={redCompetitor} />
      </div>
      <div className="blue-name blue-bg name-font">
        <PlayerNameCell competitor={blueCompetitor} />
      </div>
    </div>
  );
}
