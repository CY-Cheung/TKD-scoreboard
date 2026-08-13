/**
 * Controller shell sizing — re-exports shared browser content-box helpers.
 * Landscape aspect is cached from browser W/H (not dvw/dvh).
 */
export {
  readBrowserContentSize,
  resolveLandscapeBrowserShellSize as resolveControllerShellSize,
} from "../../Utils/browserShellSize.js";
