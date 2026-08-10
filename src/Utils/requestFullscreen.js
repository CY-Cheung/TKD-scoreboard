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
