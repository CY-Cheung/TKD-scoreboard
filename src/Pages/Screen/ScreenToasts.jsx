import React from "react";

/** Fixed top toast stack for Screen disconnect / matchLive errors. */
export default function ScreenToasts({ messages }) {
  if (!messages?.length) return null;
  return (
    <div
      className="toast-container"
      style={{
        position: "fixed",
        top: "1.04cqi",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        gap: "0.52cqi",
        pointerEvents: "none",
      }}
    >
      {messages.map((toast) => (
        <div
          key={toast.id}
          style={{
            backgroundColor: "rgba(255, 60, 48, 0.95)",
            color: "white",
            padding: "0.78cqi 1.56cqi",
            borderRadius: "0.62cqi",
            fontSize: "1.4cqi",
            fontWeight: "bold",
            boxShadow: "0 0.42cqi 1.25cqi rgba(0,0,0,0.5)",
            textAlign: "center",
            border: "0.1cqi solid rgba(255,255,255,0.2)",
          }}
        >
          {toast.text}
        </div>
      ))}
    </div>
  );
}
