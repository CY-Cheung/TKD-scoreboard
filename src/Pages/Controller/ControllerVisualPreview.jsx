import React, { useState } from "react";
import ControllerTopBar from "./ControllerTopBar";
import ControllerScorePad from "./ControllerScorePad";
import ControllerCenterPanel from "./ControllerCenterPanel";
import "./Controller.css";

/**
 * Static visual shell for design review / device testing.
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
      <div className="ctrl-shell">
        <ControllerTopBar onBack={() => {}} />

        <div className="ctrl-stage">
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
              currentRound={2}
              matchNo="42"
              roundWins={{ red: 1, blue: 0 }}
              refereeMode="single"
              mySeat="J1"
              isConnected={true}
            />
          </ControllerScorePad>
        </div>
      </div>
    </div>
  );
}
