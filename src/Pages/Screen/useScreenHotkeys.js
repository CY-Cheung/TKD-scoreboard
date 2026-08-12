import { useEffect } from "react";

/**
 * Screen keyboard shortcuts.
 * Handlers stay owned by Screen.jsx (timer / Firebase / UI state).
 *
 * @param {{
 *   onToggleTimer: () => void,
 *   onToggleDirection: () => void,
 *   onToggleEdit: () => void,
 *   onToggleQr: () => void,
 *   onToggleKyeShi: () => void,
 * }} handlers
 * @param {unknown[]} [deps]
 */
export function useScreenHotkeys(handlers, deps = []) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === "Space") {
        e.preventDefault();
        handlers.onToggleTimer();
      }
      if (e.key === "\\") {
        handlers.onToggleDirection();
      }
      if (e.key === "e" || e.key === "E") {
        handlers.onToggleEdit();
      }
      if (e.key === "q" || e.key === "Q") {
        handlers.onToggleQr();
      }
      if (e.key === "k" || e.key === "K") {
        handlers.onToggleKyeShi();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- caller supplies deps
  }, deps);
}
