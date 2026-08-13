/**
 * Fit Controller shell into the browser content box using a stable
 * *landscape* aspect from browser measurements (not dvw/dvh).
 *
 * Mobile URL chrome makes portrait max/min(dv*) differ from landscape, so
 * when width >= height we cache browser W/H aspect and reuse it in portrait.
 */

/**
 * @param {{
 *   browserWidth: number,
 *   browserHeight: number,
 *   cachedLandAspect?: number | null,
 * }} opts
 * @returns {{
 *   width: number,
 *   height: number,
 *   landAspect: number,
 *   cachedLandAspect: number | null,
 * }}
 */
export function resolveControllerShellSize({
  browserWidth,
  browserHeight,
  cachedLandAspect = null,
}) {
  const bw = Math.max(0, Number(browserWidth) || 0);
  const bh = Math.max(0, Number(browserHeight) || 0);
  if (bw <= 0 || bh <= 0) {
    return {
      width: 0,
      height: 0,
      landAspect: cachedLandAspect && cachedLandAspect > 0 ? cachedLandAspect : 1,
      cachedLandAspect:
        cachedLandAspect && cachedLandAspect > 0 ? cachedLandAspect : null,
    };
  }

  let nextCache =
    cachedLandAspect && cachedLandAspect > 0 ? cachedLandAspect : null;

  // Landscape browser box → remember this aspect (includes URL-bar inset).
  if (bw >= bh) {
    nextCache = bw / bh;
  }

  const landAspect =
    nextCache && nextCache > 0
      ? nextCache
      : Math.max(bw, bh) / Math.min(bw, bh);

  let width;
  let height;
  if (bw / bh >= landAspect) {
    height = bh;
    width = bh * landAspect;
  } else {
    width = bw;
    height = bw / landAspect;
  }

  return {
    width,
    height,
    landAspect,
    cachedLandAspect: nextCache,
  };
}

/** Read layout viewport size (browser content area). */
export function readBrowserContentSize() {
  return {
    browserWidth: window.innerWidth,
    browserHeight: window.innerHeight,
  };
}
