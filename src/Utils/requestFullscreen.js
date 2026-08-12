/**
 * Cross-browser fullscreen request for documentElement.
 * No-op if already in fullscreen.
 */
export function requestFullscreen() {
  if (document.fullscreenElement) return;

  const el = document.documentElement;
  if (el.requestFullscreen) {
    el.requestFullscreen().catch(() => {});
  } else if (el.webkitRequestFullscreen) {
    el.webkitRequestFullscreen();
  } else if (el.msRequestFullscreen) {
    el.msRequestFullscreen();
  }
}

/**
 * Double-click on the container background toggles document fullscreen.
 * Use as `onDoubleClick={toggleDoubleClickFullscreen}`.
 */
export function toggleDoubleClickFullscreen(e) {
  if (e.target !== e.currentTarget) return;
  if (!document.fullscreenElement) {
    requestFullscreen();
  } else if (document.exitFullscreen) {
    document.exitFullscreen().catch(() => {});
  }
}
