import { useLayoutEffect } from "react";
import {
  readBrowserContentSize,
  resolveLandscapeBrowserShellSize,
  resolveScreenShellSize,
} from "./browserShellSize";

/**
 * Sync --screen-width / --screen-height on a shell element from the browser
 * content box.
 *
 * @param {React.RefObject<HTMLElement | null>} rootRef
 * @param {{ mode?: "landscape" | "screen-2x1" }} [options]
 *   - landscape: cache browser landscape aspect (Controller)
 *   - screen-2x1: fixed 2:1 fit (Screen)
 */
export default function useBrowserShellSize(rootRef, options = {}) {
  const mode = options.mode || "landscape";

  useLayoutEffect(() => {
    let cachedLandAspect = null;

    const apply = () => {
      const el = rootRef.current;
      if (!el) return;
      const { browserWidth, browserHeight } = readBrowserContentSize();

      let width;
      let height;
      if (mode === "screen-2x1") {
        ({ width, height } = resolveScreenShellSize({
          browserWidth,
          browserHeight,
        }));
      } else {
        const resolved = resolveLandscapeBrowserShellSize({
          browserWidth,
          browserHeight,
          cachedLandAspect,
        });
        cachedLandAspect = resolved.cachedLandAspect;
        width = resolved.width;
        height = resolved.height;
      }

      el.style.setProperty("--screen-width", `${width}px`);
      el.style.setProperty("--screen-height", `${height}px`);
    };

    apply();
    window.addEventListener("resize", apply);
    window.addEventListener("orientationchange", apply);
    const vv = window.visualViewport;
    vv?.addEventListener("resize", apply);
    vv?.addEventListener("scroll", apply);

    return () => {
      window.removeEventListener("resize", apply);
      window.removeEventListener("orientationchange", apply);
      vv?.removeEventListener("resize", apply);
      vv?.removeEventListener("scroll", apply);
    };
  }, [rootRef, mode]);
}
