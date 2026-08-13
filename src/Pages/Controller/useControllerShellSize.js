import useBrowserShellSize from "../../Utils/useBrowserShellSize";

/**
 * Controller shell: browser content box + cached landscape aspect.
 * @param {React.RefObject<HTMLElement | null>} rootRef
 */
export default function useControllerShellSize(rootRef) {
  useBrowserShellSize(rootRef, { mode: "landscape" });
}
