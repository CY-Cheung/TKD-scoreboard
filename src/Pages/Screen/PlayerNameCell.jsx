import React from "react";

/** Competitor name + optional club under Screen name cells. */
export default function PlayerNameCell({ competitor }) {
  if (!competitor || !competitor.name) {
    return <div className="name-only"> </div>;
  }
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        lineHeight: "1.2",
      }}
    >
      <div style={{ fontSize: "1em" }}>{competitor.name}</div>
      {competitor.affiliatedClub && (
        <div style={{ fontSize: "0.45em", opacity: 0.85, marginTop: "2px" }}>
          ({competitor.affiliatedClub})
        </div>
      )}
    </div>
  );
}
