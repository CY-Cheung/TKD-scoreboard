import React from "react";
import ScreenTopNames from "../Screen/ScreenTopNames";

/**
 * Title bar inside 2:1 — same as Screen top name strip (no Back).
 * direction stays "row" (Controller score columns are fixed L→R).
 */
export default function ControllerTopBar({
  redCompetitor,
  blueCompetitor,
  isResting = false,
  direction = "row",
}) {
  return (
    <ScreenTopNames
      direction={direction}
      isResting={isResting}
      redCompetitor={redCompetitor}
      blueCompetitor={blueCompetitor}
    />
  );
}
