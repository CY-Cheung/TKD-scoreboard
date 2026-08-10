import React from "react";
import DecisionConfirm from "../DecisionFlow/DecisionConfirm";

function TechnicalCardConfirm({ side, onAccept, onReject, onCancel }) {
  return (
    <DecisionConfirm
      side={side}
      title="Technical Card"
      rejectLabel="Reject → Gam-jeom +1"
      onAccept={onAccept}
      onReject={onReject}
      onCancel={onCancel}
    />
  );
}

export default TechnicalCardConfirm;
