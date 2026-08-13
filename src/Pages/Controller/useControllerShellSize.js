import { useLayoutEffect } from "react";
import {
  readBrowserContentSize,
  resolveControllerShellSize,
} from "./controllerShellSize";

/**
 * Keep --screen-width / --screen-height on the Controller root in sync with
 * the browser content box (innerWidth/innerHeight), using a cached landscape
 * aspect so portrait URL-bar chrome does not change the ratio.
 *
 * @param {React.RefObject<HTMLElement | null>} rootRef
 */
export default function useControllerShellSize(rootRef) {
  useLayoutEffect(() => {
    let cachedLandAspect = null;

    const apply = () => {
      const el = rootRef.current;
      if (!el) return;
      const { browserWidth, browserHeight } = readBrowserContentSize();
      const resolved = resolveControllerShellSize({
        browserWidth,
        browserHeight,
        cachedLandAspect,
      });
      cachedLandAspect = resolved.cachedLandAspect;
      el.style.setProperty("--screen-width", `${resolved.width}px`);
      el.style.setProperty("--screen-height", `${resolved.height}px`);
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
  }, [rootRef]);
}
