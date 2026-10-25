import { parseHktkdaPdfFile } from "../Utils/pdfParser";
import { parseMatchesCsv, parseMatchesJson } from "./tabularImport.js";

/** Default Event ID when drawsheet import fills a blank create form. */
export function generateDefaultEventId(now = Date.now()) {
  return "TKD" + String(now).slice(-6);
}

function fileExtension(name = "") {
  const m = String(name).toLowerCase().match(/\.([a-z0-9]+)$/);
  return m ? m[1] : "";
}

/**
 * Detect drawsheet kind from File name / MIME.
 * @returns {"pdf"|"csv"|"json"|null}
 */
export function detectDrawsheetKind(file) {
  if (!file) return null;
  const ext = fileExtension(file.name);
  const type = String(file.type || "").toLowerCase();

  if (type === "application/pdf" || ext === "pdf") return "pdf";
  if (
    type === "text/csv" ||
    type === "application/csv" ||
    type === "application/vnd.ms-excel" ||
    ext === "csv"
  ) {
    return "csv";
  }
  if (
    type === "application/json" ||
    type === "text/json" ||
    ext === "json"
  ) {
    return "json";
  }
  return null;
}

async function parseDrawsheetFile(file, kind) {
  if (kind === "pdf") {
    return parseHktkdaPdfFile(file);
  }
  const text = await file.text();
  if (kind === "csv") {
    return parseMatchesCsv(text);
  }
  if (kind === "json") {
    return parseMatchesJson(text);
  }
  throw new Error("不支援的檔案格式");
}

/**
 * Shared drawsheet file → parse result for CourtSetup create modal.
 * Accepts PDF (HKTKDA), CSV, or JSON. Callers inject toast + state setters.
 * Returns the parse result or null.
 *
 * Kept name `runPdfFileSelect` for call-site compatibility.
 */
export async function runPdfFileSelect(
  file,
  {
    showToast,
    setIsParsingPdf,
    setPdfParseResult,
    setNewEventName,
    newEventId,
    setNewEventId,
    fileInputRef,
    generateEventId = generateDefaultEventId,
  } = {}
) {
  if (!file) return null;

  const kind = detectDrawsheetKind(file);
  if (!kind) {
    showToast?.("請選擇有效的 PDF、CSV 或 JSON 賽程文件！");
    return null;
  }

  setIsParsingPdf?.(true);
  try {
    const result = await parseDrawsheetFile(file, kind);
    if (!result || result.matchCount === 0) {
      const emptyMsg =
        kind === "pdf"
          ? "未能在 PDF 中解析出有效賽程，請確認格式是否為香港跆拳道協會對陣表。"
          : "未能解析出有效賽程，請確認 CSV／JSON 欄位（至少需要 matchId）。";
      showToast?.(emptyMsg);
      return null;
    }
    setPdfParseResult?.(result);
    setNewEventName?.(result.eventName);
    if (!newEventId) {
      setNewEventId?.(generateEventId());
    }
    return result;
  } catch (error) {
    console.error("Drawsheet parsing failed:", error);
    const label =
      kind === "pdf" ? "PDF" : kind === "csv" ? "CSV" : "JSON";
    showToast?.(`解析 ${label} 失敗: ${error.message}`);
    return null;
  } finally {
    setIsParsingPdf?.(false);
    if (fileInputRef?.current) {
      fileInputRef.current.value = "";
    }
  }
}

/** Alias with clearer name; same implementation. */
export const runDrawsheetFileSelect = runPdfFileSelect;
