import React from "react";
import DecisionConfirm from "../DecisionFlow/DecisionConfirm";

function IVRConfirm({ side, onAccept, onReject, onCancel }) {
  if (!side) return null;
  const sideLabel = side === "blue" ? "Blue" : "Red";

  return (
    <DecisionConfirm
      side={side}
      title={`${sideLabel}: IVR`}
      acceptLabel="Accept"
      rejectLabel="Reject"
      onAccept={onAccept}
      onReject={onReject}
      onCancel={onCancel}
    />
  );
}

export default IVRConfirm;
