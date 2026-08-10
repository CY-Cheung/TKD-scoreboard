import React from "react";
import { FilePlayFill, FileFontFill } from "react-bootstrap-icons";
import DecisionAnnouncement from "../DecisionFlow/DecisionAnnouncement";

function TechnicalCardAnnouncement({ visible, side, decision, startedAt, onComplete }) {
  const sideColor =
    side === "blue" ? "var(--blue-primary, #0000aa)" : "var(--red-primary, #aa0000)";

  return (
    <DecisionAnnouncement
      visible={visible}
      side={side}
      decision={decision}
      startedAt={startedAt}
      onComplete={onComplete}
      title="Technical Card"
      showReturnCard
      showGamjeomOnReject
      leftIcons={
        <>
          <FilePlayFill color={sideColor} aria-hidden />
          <FileFontFill color="#22c55e" aria-hidden />
        </>
      }
    />
  );
}

export default TechnicalCardAnnouncement;
