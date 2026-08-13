import React, { useState } from "react";
import ControllerTopBar from "./ControllerTopBar";
import ControllerScorePad from "./ControllerScorePad";
import ControllerCenterPanel from "./ControllerCenterPanel";
import "./Controller.css";

/**
 * Static visual shell for design review / screenshots.
 * No Firebase, seat grab, or scoring side-effects.
 */
export default function ControllerVisualPreview() {
  const [lastAction, setLastAction] = useState(null);

  const handleScore = (side, _index, label) => {
    const text = `${side.toUpperCase()} ${label}`;
    setLastAction({ side, text });
    setTimeout(() => {
      setLastAction((prev) => (prev?.text === text ? null : prev));
    }, 1800);
  };

  return (
    <div className="controller">
      <ControllerTopBar isConnected={true} onBack={() => {}} />

      {lastAction && (
        <div
          className={`ctrl-action-banner ${
            lastAction.side === "red" ? "red-banner" : "blue-banner"
          }`}
        >
          {lastAction.text}
        </div>
      )}

      <ControllerScorePad onScore={handleScore}>
        <ControllerCenterPanel
          redName="Hong (Red)"
          blueName="Chung (Blue)"
          redScore={12}
          blueScore={9}
          currentRound={2}
          isPaused={false}
          refereeMode="single"
          mySeat="J1"
          eventLabel="Open Cup (Day 1)"
          courtId="Court1"
          matchNo="42"
        />
      </ControllerScorePad>
    </div>
  );
}
