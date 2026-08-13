import React from "react";

/** Competitor name + optional club under Screen name cells. */
export default function PlayerNameCell({ competitor }) {
  if (!competitor || !competitor.name) {
    return <div className="name-only"> </div>;
  }
  return (
    <div className="player-name-cell">
      <div className="player-name-cell-name">{competitor.name}</div>
      {competitor.affiliatedClub && (
        <div className="player-name-cell-club">
          ({competitor.affiliatedClub})
        </div>
      )}
    </div>
  );
}
