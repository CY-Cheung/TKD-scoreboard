/**
 * Style for the Screen "Time out" / REST TIME chip under the timer.
 * @param {{ isMatchLoaded: boolean, isPaused: boolean, isResting: boolean }} opts
 */
export function getTimeoutStyle({ isMatchLoaded, isPaused, isResting }) {
  const style = { backgroundColor: "#FFFF00", color: "#000000" };
  if (isMatchLoaded) {
    Object.assign(style, {
      backgroundColor: !isPaused ? "#000000" : "#FFFF00",
    });
    if (isPaused) {
      style.color = "#000000";
    } else if (!isResting) {
      style.color = "#000000";
    }
  }
  return style;
}
