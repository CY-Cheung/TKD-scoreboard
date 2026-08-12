import { parseHktkdaPdfFile } from "../Utils/pdfParser";

/** Default Event ID when PDF import fills a blank create form. */
export function generateDefaultEventId(now = Date.now()) {
  return "TKD" + String(now).slice(-6);
}

/**
 * Shared PDF file → parse result flow for CourtSetup / DataImport create modals.
 * Callers inject toast + state setters; returns the parse result or null.
 */
export async function runPdfFileSelect(file, {
  showToast,
  setIsParsingPdf,
  setPdfParseResult,
  setNewEventName,
  newEventId,
  setNewEventId,
  fileInputRef,
  generateEventId = generateDefaultEventId,
} = {}) {
  if (!file) return null;

  if (file.type !== "application/pdf" && !file.name.endsWith(".pdf")) {
    showToast?.("請選擇有效的 PDF 賽程文件！");
    return null;
  }

  setIsParsingPdf?.(true);
  try {
    const result = await parseHktkdaPdfFile(file);
    if (!result || result.matchCount === 0) {
      showToast?.(
        "未能在 PDF 中解析出有效賽程，請確認格式是否為香港跆拳道協會對陣表。"
      );
      return null;
    }
    setPdfParseResult?.(result);
    setNewEventName?.(result.eventName);
    if (!newEventId) {
      setNewEventId?.(generateEventId());
    }
    return result;
  } catch (error) {
    console.error("PDF Parsing Failed:", error);
    showToast?.(`解析 PDF 失敗: ${error.message}`);
    return null;
  } finally {
    setIsParsingPdf?.(false);
    if (fileInputRef?.current) {
      fileInputRef.current.value = "";
    }
  }
}
