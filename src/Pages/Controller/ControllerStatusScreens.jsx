import React from "react";
import Button from "../../Components/Button/Button";

/** Connecting / seat-grab failure / court-full gates. */
export function ControllerConnectingScreen() {
  return (
    <div
      className="controller"
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        color: "white",
        padding: "20px",
        textAlign: "center",
      }}
    >
      <h1>Connecting…</h1>
      <p>正在搶裁判席位（J1–J3）…</p>
    </div>
  );
}

export function ControllerSeatGrabErrorScreen({ error, onRetry }) {
  return (
    <div
      className="controller"
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        color: "white",
        padding: "20px",
        textAlign: "center",
      }}
    >
      <h1 style={{ color: "var(--red-primary, #aa0000)" }}>Seat Grab Failed</h1>
      <p>搶位失敗。請確認 Firebase rules 已 publish，並重新掃 QR。</p>
      <p
        style={{
          opacity: 0.7,
          fontSize: "0.9rem",
          wordBreak: "break-all",
        }}
      >
        {error}
      </p>
      <Button text="Retry (重試)" onClick={onRetry} variant="yellow" />
    </div>
  );
}

export function ControllerCourtFullScreen({ onBack }) {
  return (
    <div
      className="controller"
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        color: "white",
        padding: "20px",
        textAlign: "center",
      }}
    >
      <h1 style={{ color: "var(--red-primary, #aa0000)" }}>Court is Full</h1>
      <p>There are already 3 referees connected to this court.</p>
      <Button text="Back (返回)" onClick={onBack} variant="orange" />
    </div>
  );
}
