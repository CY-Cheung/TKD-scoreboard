/**
 * Controller deep-link / device helpers (no Firebase side effects).
 */

export function getDeviceName(userAgent = navigator.userAgent) {
  if (/iPad/i.test(userAgent)) return "iPad";
  if (/iPhone/i.test(userAgent)) return "iPhone";
  if (/Android/i.test(userAgent)) return "Android";
  if (/Mac OS X/i.test(userAgent)) return "Mac";
  if (/Windows/i.test(userAgent)) return "Windows";
  return "Device";
}

/**
 * Resolve event/court from React Router searchParams, window search,
 * hash query, EventSession, or sessionStorage fallback.
 */
export function resolveControllerParam(
  key,
  { searchParams, session, sessionStorage: storage = sessionStorage } = {}
) {
  const fromSearch = searchParams?.get?.(key);
  if (fromSearch) return fromSearch;

  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get(key)) return urlParams.get(key);

  if (window.location.hash.includes("?")) {
    const hashQuery = window.location.hash.split("?")[1];
    const hashParams = new URLSearchParams(hashQuery);
    if (hashParams.get(key)) return hashParams.get(key);
  }

  if (key === "event") {
    return session?.eventId || storage.getItem("selectedEvent") || "";
  }
  if (key === "court") {
    return session?.courtId || storage.getItem("selectedCourt") || "";
  }

  return "";
}
