/**
 * Pure Screen scoreboard color helpers.
 * Rendering stays in Screen / ScreenMiddleBoard.
 */

/**
 * @param {{ isPaused: boolean, isResting: boolean, dominantSide: string }} params
 */
export function resolveScreenBoardColors({
  isPaused,
  isResting,
  dominantSide,
}) {
  return {
    timerColor: isPaused ? "#FFFF00" : "#FFFFFF",
    redScoreColor:
      !isResting && dominantSide === "red" ? "#FFFF00" : "#FFFFFF",
    blueScoreColor:
      !isResting && dominantSide === "blue" ? "#FFFF00" : "#FFFFFF",
  };
}
