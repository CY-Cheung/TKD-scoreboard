import React from "react";
import Button from "../Button/Button";

/**
 * Shared Accept / Reject / Cancel glass overlay used by IVR and Technical Card.
 */
function DecisionConfirm({
  side,
  title,
  acceptLabel = "Accept",
  rejectLabel = "Reject",
  onAccept,
  onReject,
  onCancel,
}) {
  if (!side) return null;

  const buttonAngle = side === "blue" ? 220 : 0;

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.6)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 2000,
        backdropFilter: "blur(5px)",
      }}
    >
      <div
        className="glass-panel"
        style={{
          padding: "3cqi 4cqi",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "2cqi",
          border: "2px solid rgba(255, 255, 255, 0.2)",
          borderRadius: "2cqi",
          background: "rgba(30, 30, 40, 0.85)",
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: "2.2cqi",
            color: "white",
            textShadow: "0 2px 4px rgba(0,0,0,0.5)",
          }}
        >
          {title}
        </h2>
        <div style={{ display: "flex", gap: "2cqi", marginTop: "1cqi" }}>
          <Button
            text={acceptLabel}
            fontSize="1.6cqi"
            onClick={onAccept}
            angle={buttonAngle}
            style={{ padding: "1cqi 2cqi" }}
          />
          <Button
            text={rejectLabel}
            fontSize="1.6cqi"
            onClick={onReject}
            angle={buttonAngle}
            style={{ padding: "1cqi 2cqi" }}
          />
        </div>
        {onCancel && (
          <Button
            text="Cancel"
            fontSize="1.2cqi"
            variant="cancel"
            onClick={onCancel}
            style={{ marginTop: "1cqi", padding: "0.5cqi 2cqi" }}
          />
        )}
      </div>
    </div>
  );
}

export default DecisionConfirm;
