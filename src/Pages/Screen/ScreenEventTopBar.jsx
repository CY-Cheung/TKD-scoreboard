import React from "react";

/** Floating event name above the scoreboard. */
export default function ScreenEventTopBar({ eventLabel }) {
  return (
    <div
      className="screen-floating-top-bar"
      style={{
        position: "absolute",
        bottom: "100%",
        left: 0,
        width: "100%",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding:
          "calc(var(--screen-height) * 0.03) calc(var(--screen-width) * 0.03)",
        zIndex: 100,
        boxSizing: "border-box",
        color: "rgba(255,255,255,0.5)",
        fontFamily: "Outfit, sans-serif",
      }}
    >
      <div
        style={{
          fontSize: "calc(var(--screen-width) * 0.018)",
          fontWeight: 600,
          letterSpacing: "2px",
          textTransform: "uppercase",
        }}
      >
        {eventLabel}
      </div>
    </div>
  );
}
