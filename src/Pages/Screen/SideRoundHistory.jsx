import React from "react";

/** Round-by-round score list + total wins for one colour during REST/final. */
export default function SideRoundHistory({ color, roundScores, roundWins }) {
  const scores = roundScores || {};
  const wins = roundWins || {};
  return (
    <div className="round-history-container">
      {Object.entries(scores)
        .sort(([a], [b]) => parseInt(a.substring(1)) - parseInt(b.substring(1)))
        .map(([round, scoreData]) => (
          <div className="history-row" key={round}>
            <span className="history-label">{round}</span>
            <span className="history-value">{scoreData?.[color] ?? 0}</span>
          </div>
        ))}
      <div className="total-round-wins">{wins[color] ?? 0}</div>
    </div>
  );
}
