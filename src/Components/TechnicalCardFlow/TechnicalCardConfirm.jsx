import React from "react";
import DecisionConfirm from "../DecisionFlow/DecisionConfirm";

function TechnicalCardConfirm({ side, onAccept, onReject, onCancel }) {
  if (!side) return null;
  const sideLabel = side === "blue" ? "Blue" : "Red";

  return (
    <DecisionConfirm
      side={side}
      title={`${sideLabel}: Technical Card`}
      acceptLabel="Accept"
      rejectLabel="Reject → Gam-jeom +1"
      onAccept={onAccept}
      onReject={onReject}
      onCancel={onCancel}
    />
  );
}

export default TechnicalCardConfirm;
