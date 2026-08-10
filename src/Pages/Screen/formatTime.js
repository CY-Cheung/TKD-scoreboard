/**
 * Format seconds as M:SS for Screen timer display.
 */
export function formatTime(totalSeconds) {
  if (typeof totalSeconds !== "number" || isNaN(totalSeconds)) {
    return "0:00";
  }
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
