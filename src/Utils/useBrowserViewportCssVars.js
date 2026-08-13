import { useLayoutEffect } from "react";
import {
  applyBrowserViewportCssVars,
  readBrowserContentSize,
} from "./browserShellSize";

/**
 * Keep :root --browser-width / --browser-height in sync with the browser
 * content box for full-bleed layouts (replaces 100dvw / 100dvh fills).
 */
export default function useBrowserViewportCssVars() {
  useLayoutEffect(() => {
    const apply = () => {
      applyBrowserViewportCssVars(readBrowserContentSize());
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
  }, []);
}
