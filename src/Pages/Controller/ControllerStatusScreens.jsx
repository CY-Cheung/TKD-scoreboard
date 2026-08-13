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
        padding: "2cqi",
        textAlign: "center",
        gap: "1cqi",
      }}
    >
      <h1 style={{ fontSize: "3cqi", margin: 0 }}>Connecting…</h1>
      <p style={{ fontSize: "1.6cqi", margin: 0 }}>
        正在搶裁判席位（J1–J3）…
      </p>
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
        padding: "2cqi",
        textAlign: "center",
        gap: "1cqi",
      }}
    >
      <h1
        style={{
          color: "var(--red-primary, #aa0000)",
          fontSize: "3cqi",
          margin: 0,
        }}
      >
        Seat Grab Failed
      </h1>
      <p style={{ fontSize: "1.6cqi", margin: 0 }}>
        搶位失敗。請確認 Firebase rules 已 publish，並重新掃 QR。
      </p>
      <p
        style={{
          opacity: 0.7,
          fontSize: "1.4cqi",
          wordBreak: "break-all",
          margin: 0,
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
        padding: "2cqi",
        textAlign: "center",
        gap: "1cqi",
      }}
    >
      <h1
        style={{
          color: "var(--red-primary, #aa0000)",
          fontSize: "3cqi",
          margin: 0,
        }}
      >
        Court is Full
      </h1>
      <p style={{ fontSize: "1.6cqi", margin: 0 }}>
        There are already 3 referees connected to this court.
      </p>
      <Button text="Back (返回)" onClick={onBack} variant="orange" />
    </div>
  );
}
