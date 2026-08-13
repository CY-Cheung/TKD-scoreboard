/**
 * Browser content-box sizing (window.innerWidth / innerHeight).
 * Prefer this over dvw/dvh max/min — mobile URL chrome makes those ratios
 * drift between landscape and portrait.
 */

/** @returns {{ browserWidth: number, browserHeight: number }} */
export function readBrowserContentSize() {
  return {
    browserWidth: window.innerWidth,
    browserHeight: window.innerHeight,
  };
}

/**
 * Largest box of the given width/height aspect that fits in the browser box.
 * @param {{ browserWidth: number, browserHeight: number, aspect: number }} opts
 *   aspect = width / height (e.g. 2 for Screen 2:1)
 */
export function fitAspectIntoBrowser({
  browserWidth,
  browserHeight,
  aspect,
}) {
  const bw = Math.max(0, Number(browserWidth) || 0);
  const bh = Math.max(0, Number(browserHeight) || 0);
  const a = Number(aspect);
  if (bw <= 0 || bh <= 0 || !(a > 0)) {
    return { width: 0, height: 0, aspect: a > 0 ? a : 1 };
  }

  let width;
  let height;
  if (bw / bh >= a) {
    height = bh;
    width = bh * a;
  } else {
    width = bw;
    height = bw / a;
  }
  return { width, height, aspect: a };
}

/**
 * Controller-style: always use landscape browser aspect.
 * Cache aspect when width >= height so portrait URL-bar changes cannot
 * invent a different ratio.
 *
 * @param {{
 *   browserWidth: number,
 *   browserHeight: number,
 *   cachedLandAspect?: number | null,
 * }} opts
 */
export function resolveLandscapeBrowserShellSize({
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

  if (bw >= bh) {
    nextCache = bw / bh;
  }

  const landAspect =
    nextCache && nextCache > 0
      ? nextCache
      : Math.max(bw, bh) / Math.min(bw, bh);

  const fitted = fitAspectIntoBrowser({
    browserWidth: bw,
    browserHeight: bh,
    aspect: landAspect,
  });

  return {
    width: fitted.width,
    height: fitted.height,
    landAspect,
    cachedLandAspect: nextCache,
  };
}

/** Screen 2:1 shell from browser content box (no dvw/dvh). */
export function resolveScreenShellSize({ browserWidth, browserHeight }) {
  return fitAspectIntoBrowser({
    browserWidth,
    browserHeight,
    aspect: 2,
  });
}

/**
 * Apply --browser-width / --browser-height on :root for full-bleed pages.
 * @param {{ browserWidth: number, browserHeight: number }} size
 */
export function applyBrowserViewportCssVars({
  browserWidth,
  browserHeight,
  target = typeof document !== "undefined" ? document.documentElement : null,
} = {}) {
  if (!target) return;
  target.style.setProperty("--browser-width", `${browserWidth}px`);
  target.style.setProperty("--browser-height", `${browserHeight}px`);
}
