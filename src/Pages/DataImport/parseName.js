/**
 * Parse "Name (Club)" competitor strings from older drawsheet text.
 * @returns {{ name: string, club: string }}
 */
export function parseName(fullName) {
  if (!fullName) return { name: "", club: "" };
  const match = fullName.match(/(.+?)\s*\((.+)\)/);
  if (match) {
    return { name: match[1].trim(), club: match[2].trim() };
  }
  return { name: fullName, club: "" };
}
