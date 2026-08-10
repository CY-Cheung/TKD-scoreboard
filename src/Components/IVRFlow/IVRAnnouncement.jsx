import React from "react";
import { FilePlayFill } from "react-bootstrap-icons";
import { projectIvrRemaining, isIvrUnlimited } from "../../Api";
import DecisionAnnouncement from "../DecisionFlow/DecisionAnnouncement";

function IVRAnnouncement({
  visible,
  side,
  decision,
  startedAt,
  ivrRemaining = 0,
  onComplete,
}) {
  const isAccept = decision === "accept";
  const projectedRemaining = decision
    ? projectIvrRemaining(ivrRemaining, decision)
    : ivrRemaining;
  const showReturnCard =
    Boolean(decision) &&
    isAccept &&
    (isIvrUnlimited(projectedRemaining) || projectedRemaining > 0);
  const sideColor =
    side === "blue" ? "var(--blue-primary, #0000aa)" : "var(--red-primary, #aa0000)";

  return (
    <DecisionAnnouncement
      visible={visible}
      side={side}
      decision={decision}
      startedAt={startedAt}
      onComplete={onComplete}
      title="Video Replay"
      extraCardClassName="ivr-announce-card"
      showReturnCard={showReturnCard}
      showGamjeomOnReject={false}
      leftIcons={<FilePlayFill color={sideColor} aria-hidden />}
    />
  );
}

export default IVRAnnouncement;
