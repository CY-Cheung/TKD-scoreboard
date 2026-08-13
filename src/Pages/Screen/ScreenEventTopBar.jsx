import React from "react";

/** Floating event name above the scoreboard. */
export default function ScreenEventTopBar({ eventLabel }) {
  return (
    <div className="screen-floating-top-bar">
      <div className="screen-floating-top-bar-label">{eventLabel}</div>
    </div>
  );
}
