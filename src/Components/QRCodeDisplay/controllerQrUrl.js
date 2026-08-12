/** Public GitHub Pages host — phones can open this; Cloud Agent / localhost usually cannot. */
export const PUBLIC_PAGES_HOST = "cy-cheung.github.io";
export const APP_BASE_PATH = "/TKD-scoreboard/";

export function isPhoneUnreachableHost(hostname) {
  if (!hostname) return true;
  if (hostname === "localhost" || hostname === "127.0.0.1") return true;
  if (hostname.endsWith(".agent.cvm.dev") || hostname.endsWith(".cursorvm.com")) {
    return true;
  }
  return false;
}

function stripProtocol(hostOrUrl) {
  return String(hostOrUrl || "")
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/+$/, "");
}

/**
 * Build Controller deep-link for QR.
 * On unreachable hosts (localhost / Cloud Agent), default to GitHub Pages
 * so phones do not encode a URL they can never open.
 */
export function buildControllerQrUrl({
  eventId,
  courtId,
  hostname,
  hostWithPort,
  protocol,
  pathname,
  customHost = "",
  publicHost = PUBLIC_PAGES_HOST,
  appBasePath = APP_BASE_PATH,
}) {
  const custom = stripProtocol(customHost);
  const unreachable = isPhoneUnreachableHost(hostname);
  const host = custom || (unreachable ? publicHost : hostWithPort);

  const hostNameOnly = host.split(":")[0];
  const isLocalIp = /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostNameOnly);
  const isLocal =
    hostNameOnly === "localhost" || hostNameOnly === "127.0.0.1" || isLocalIp;
  const resolvedProtocol = isLocal
    ? "http:"
    : hostNameOnly.endsWith("github.io")
      ? "https:"
      : protocol || "https:";

  let basePath;
  if (hostNameOnly.endsWith("github.io") || (!custom && unreachable)) {
    basePath = appBasePath;
  } else {
    basePath = String(pathname || appBasePath).replace(
      /\/(screen|controller|home)\/?$/,
      "/"
    );
    if (!basePath.endsWith("/")) basePath += "/";
  }

  return `${resolvedProtocol}//${host}${basePath}controller?event=${encodeURIComponent(
    eventId || ""
  )}&court=${encodeURIComponent(courtId || "")}`;
}
