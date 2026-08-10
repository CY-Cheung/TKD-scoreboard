import React from "react";
import DecisionConfirm from "../DecisionFlow/DecisionConfirm";

function IVRConfirm({ side, onAccept, onReject, onCancel }) {
  return (
    <DecisionConfirm
      side={side}
      title="IVR"
      rejectLabel="Reject"
      onAccept={onAccept}
      onReject={onReject}
      onCancel={onCancel}
    />
  );
}

export default IVRConfirm;
