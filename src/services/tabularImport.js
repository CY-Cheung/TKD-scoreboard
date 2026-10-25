/**
 * CSV / JSON drawsheet import → same pdfParseResult shape as parseHktkdaPdfFile.
 *
 * CSV columns (header required; case-insensitive aliases):
 *   matchId (required)
 *   blueName, blueClub | blueAffiliatedClub
 *   redName, redClub | redAffiliatedClub
 *   bluePreviousMatch, redPreviousMatch (optional)
 *   nextMatchId, nextMatchSlot (blue|red, optional)
 *   matchDate (optional; prefer DD/MM/YYYY for multi-day split)
 *   categoryTitle, courtCode (optional)
 *   eventName (optional; first non-empty wins as event name)
 */
import {
  createEmptyMatchConfig,
  finalizeParsedMatch,
} from "./matchFactory.js";

const HEADER_ALIASES = {
  matchid: "matchId",
  bluename: "blueName",
  blueclub: "blueClub",
  blueaffiliatedclub: "blueClub",
  redname: "redName",
  redclub: "redClub",
  redaffiliatedclub: "redClub",
  bluepreviousmatch: "bluePreviousMatch",
  redpreviousmatch: "redPreviousMatch",
  nextmatchid: "nextMatchId",
  nextmatchslot: "nextMatchSlot",
  matchdate: "matchDate",
  categorytitle: "categoryTitle",
  courtcode: "courtCode",
  eventname: "eventName",
  courtid: "courtId",
};

function normalizeHeader(raw) {
  const key = String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");
  return HEADER_ALIASES[key] || null;
}

/**
 * Minimal CSV parser: commas, quoted fields ("" escapes), CRLF/LF rows.
 */
export function parseCsvText(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  const s = String(text ?? "");

  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (inQuotes) {
      if (ch === '"') {
        if (s[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      continue;
    }
    if (ch === ",") {
      row.push(field);
      field = "";
      continue;
    }
    if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && s[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.some((cell) => String(cell).trim() !== "")) {
        rows.push(row);
      }
      row = [];
      continue;
    }
    field += ch;
  }
  row.push(field);
  if (row.some((cell) => String(cell).trim() !== "")) {
    rows.push(row);
  }
  return rows;
}

function cell(rowObj, key) {
  const v = rowObj[key];
  if (v == null) return "";
  return String(v).trim();
}

function normalizeSlot(raw) {
  const s = String(raw ?? "")
    .trim()
    .toLowerCase();
  if (s === "blue" || s === "red") return s;
  return null;
}

/**
 * Flatten one logical match row (CSV object or JSON object) into field bag.
 */
function coerceRowFields(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;

  // Nested config shape: { matchId, config: { ... } } or { config: { matchId, competitors } }
  if (raw.config && typeof raw.config === "object") {
    const c = raw.config;
    const blue = c.competitors?.blue || {};
    const red = c.competitors?.red || {};
    return {
      matchId: c.matchId || raw.matchId || "",
      blueName: blue.name ?? "",
      blueClub: blue.affiliatedClub ?? "",
      redName: red.name ?? "",
      redClub: red.affiliatedClub ?? "",
      bluePreviousMatch: blue.previousMatch ?? "",
      redPreviousMatch: red.previousMatch ?? "",
      nextMatchId: c.nextMatchId ?? "",
      nextMatchSlot: c.nextMatchSlot ?? "",
      matchDate: c.matchDate ?? raw.matchDate ?? "",
      categoryTitle: c.categoryTitle ?? "",
      courtCode: c.courtCode ?? "",
      eventName: raw.eventName ?? "",
      courtId: raw.courtId ?? "",
    };
  }

  // Flat object: map keys via aliases + direct known names
  const out = {
    matchId: "",
    blueName: "",
    blueClub: "",
    redName: "",
    redClub: "",
    bluePreviousMatch: "",
    redPreviousMatch: "",
    nextMatchId: "",
    nextMatchSlot: "",
    matchDate: "",
    categoryTitle: "",
    courtCode: "",
    eventName: "",
    courtId: "",
  };

  for (const [k, v] of Object.entries(raw)) {
    const mapped = normalizeHeader(k);
    if (mapped && mapped in out) {
      out[mapped] = v == null ? "" : String(v);
    } else if (k === "matchId" || k in out) {
      out[k] = v == null ? "" : String(v);
    }
  }

  // Nested competitors without full config wrapper
  if (raw.competitors?.blue || raw.competitors?.red) {
    const blue = raw.competitors.blue || {};
    const red = raw.competitors.red || {};
    if (!out.blueName && blue.name) out.blueName = String(blue.name);
    if (!out.blueClub && blue.affiliatedClub)
      out.blueClub = String(blue.affiliatedClub);
    if (!out.bluePreviousMatch && blue.previousMatch)
      out.bluePreviousMatch = String(blue.previousMatch);
    if (!out.redName && red.name) out.redName = String(red.name);
    if (!out.redClub && red.affiliatedClub)
      out.redClub = String(red.affiliatedClub);
    if (!out.redPreviousMatch && red.previousMatch)
      out.redPreviousMatch = String(red.previousMatch);
  }

  return out;
}

function buildCompetitor(name, club, previousMatch) {
  const comp = {
    name: name || "",
    affiliatedClub: club || "",
  };
  if (previousMatch) {
    comp.previousMatch = previousMatch;
  }
  return comp;
}

function rowToMatchDoc(row) {
  const matchId = cell(row, "matchId");
  if (!matchId) {
    throw new Error("缺少 matchId（每列必須有比賽編號）");
  }

  const config = createEmptyMatchConfig({
    matchId,
    categoryTitle: cell(row, "categoryTitle"),
    matchDate: cell(row, "matchDate"),
    courtCode: cell(row, "courtCode"),
  });

  const nextId = cell(row, "nextMatchId");
  config.nextMatchId = nextId || null;
  config.nextMatchSlot = nextId
    ? normalizeSlot(cell(row, "nextMatchSlot"))
    : null;

  config.competitors.blue = buildCompetitor(
    cell(row, "blueName"),
    cell(row, "blueClub"),
    cell(row, "bluePreviousMatch")
  );
  config.competitors.red = buildCompetitor(
    cell(row, "redName"),
    cell(row, "redClub"),
    cell(row, "redPreviousMatch")
  );

  return finalizeParsedMatch({ config });
}

function isBlankRow(row) {
  if (!row) return true;
  return Object.values(row).every((v) => String(v ?? "").trim() === "");
}

/**
 * Shared builder: flat field rows → pdfParseResult-compatible object.
 * @param {object[]} rows
 * @param {{ eventName?: string, courtId?: string, rowOffset?: number }} [options]
 *   rowOffset: 1-based source line of first data row (CSV default 2 = after header)
 */
export function buildParseResultFromMatchRows(rows, options = {}) {
  const list = Array.isArray(rows) ? rows : [];
  const matches = {};
  const dateGroups = {};
  const categories = [];
  let eventName = (options.eventName && String(options.eventName).trim()) || "";
  let courtId = (options.courtId && String(options.courtId).trim()) || "";
  const rowOffset =
    typeof options.rowOffset === "number" && options.rowOffset > 0
      ? options.rowOffset
      : 1;

  for (let i = 0; i < list.length; i++) {
    const raw = list[i];
    const row = coerceRowFields(raw);
    if (!row || isBlankRow(row)) continue;

    const sourceRow = rowOffset + i;
    if (!cell(row, "matchId")) {
      throw new Error(
        `第 ${sourceRow} 行缺少 matchId（每列必須有比賽編號）`
      );
    }

    if (!eventName && cell(row, "eventName")) {
      eventName = cell(row, "eventName");
    }
    if (!courtId && cell(row, "courtId")) {
      courtId = cell(row, "courtId");
    }

    const doc = rowToMatchDoc(row);
    const mId = doc.config.matchId;
    matches[mId] = doc;

    const dateStr = cell(row, "matchDate") || "Day 1";
    if (!dateGroups[dateStr]) {
      dateGroups[dateStr] = { dateStr, matches: {} };
    }
    dateGroups[dateStr].matches[mId] = doc;

    const cat = cell(row, "categoryTitle");
    if (cat && !categories.includes(cat)) {
      categories.push(cat);
    }
  }

  const matchCount = Object.keys(matches).length;
  if (matchCount === 0) {
    throw new Error("未能解析出有效賽程（0 場比賽）");
  }

  const datesList = Object.keys(dateGroups);

  return {
    eventName: eventName || "跆拳道錦標賽",
    courtId: courtId || "court1",
    matchCount,
    categories,
    datesList,
    dateGroups,
    matches,
  };
}

export function parseMatchesCsv(text) {
  const table = parseCsvText(text);
  if (table.length < 2) {
    throw new Error("CSV 需要標題列與至少一列資料");
  }

  const headers = table[0].map((h) => normalizeHeader(h));
  if (!headers.includes("matchId")) {
    throw new Error("CSV 標題列必須包含 matchId");
  }

  const rows = [];
  for (let r = 1; r < table.length; r++) {
    const cells = table[r];
    const obj = {};
    headers.forEach((key, i) => {
      if (!key) return;
      obj[key] = cells[i] ?? "";
    });
    rows.push(obj);
  }

  // CSV data starts at spreadsheet row 2 (row 1 = header)
  return buildParseResultFromMatchRows(rows, { rowOffset: 2 });
}

export function parseMatchesJson(textOrObject) {
  let data = textOrObject;
  if (typeof textOrObject === "string") {
    try {
      data = JSON.parse(textOrObject);
    } catch (err) {
      throw new Error(`JSON 格式錯誤: ${err.message}`);
    }
  }

  if (Array.isArray(data)) {
    return buildParseResultFromMatchRows(data);
  }

  if (!data || typeof data !== "object") {
    throw new Error("JSON 必須係物件或比賽陣列");
  }

  const eventName = data.eventName;
  const courtId = data.courtId;

  if (Array.isArray(data.matches)) {
    return buildParseResultFromMatchRows(data.matches, { eventName, courtId });
  }

  if (data.matches && typeof data.matches === "object") {
    const rows = Object.entries(data.matches).map(([id, value]) => {
      if (!value || typeof value !== "object") {
        return { matchId: id };
      }
      if (value.config) {
        return {
          ...value,
          matchId: value.config.matchId || value.matchId || id,
          eventName: value.eventName,
        };
      }
      return { matchId: value.matchId || id, ...value };
    });
    return buildParseResultFromMatchRows(rows, { eventName, courtId });
  }

  throw new Error(
    "JSON 需為比賽陣列，或含 matches 陣列／物件嘅結構"
  );
}
