import { isPhoneUnreachableHost } from "./controllerQrUrl.js";

/**
 * UI flags for Network Host / IP block on the QR modal.
 */
export function getQrHostFlags(hostname, customHost = "") {
  const trimmed = String(customHost || "").trim();
  const isLocalhost =
    hostname === "localhost" || hostname === "127.0.0.1";
  const unreachable = isPhoneUnreachableHost(hostname);
  return {
    isLocalhost,
    usingUnreachableDefault: unreachable && !trimmed,
    needsCustomHost: unreachable || !!trimmed,
  };
}
