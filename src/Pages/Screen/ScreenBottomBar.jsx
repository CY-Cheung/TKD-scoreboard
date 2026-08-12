import React from "react";
import ScreenIvrStatus from "./ScreenIvrStatus";
import ScreenRoundWins from "./ScreenRoundWins";

/**
 * Bottom gam-jeom / IVR / round strip. Parent owns edit drawer open.
 */
export default function ScreenBottomBar({
  direction,
  redGamJeom,
  blueGamJeom,
  redIvrRemaining,
  blueIvrRemaining,
  roundWins,
  currentRound,
  onOpenEdit,
}) {
  return (
    <div className="bottom" style={{ flexDirection: direction }}>
      <div className="red-gamjeom red-bg cursor-target" onClick={onOpenEdit}>
        <div className="gamjeom-number">{redGamJeom}</div>
        <div className="gamjeom-font">GAM-JEOM</div>
      </div>

      <div className="red-score-info red-bg cursor-target" onClick={onOpenEdit}>
        <ScreenIvrStatus remaining={redIvrRemaining} />
      </div>

      <ScreenRoundWins
        direction={direction}
        roundWins={roundWins}
        currentRound={currentRound}
      />

      <div className="blue-score-info blue-bg cursor-target" onClick={onOpenEdit}>
        <ScreenIvrStatus remaining={blueIvrRemaining} />
      </div>

      <div className="blue-gamjeom blue-bg cursor-target" onClick={onOpenEdit}>
        <div className="gamjeom-number">{blueGamJeom}</div>
        <div className="gamjeom-font">GAM-JEOM</div>
      </div>
    </div>
  );
}
