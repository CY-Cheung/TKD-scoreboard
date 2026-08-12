import React from "react";
import {
  FolderPlus,
  FileEarmarkPdf,
  FileEarmarkArrowUp,
  XCircle,
  CheckCircle,
} from "react-bootstrap-icons";
import Button from "../../Components/Button/Button";
import { StableLocaleText } from "../../Components/AlternatingLocale/AlternatingLocale";

/**
 * Presentational Create Event overlay for CourtSetup.
 * Firebase / PDF parse handlers stay in the page.
 */
export default function CreateEventModal({
  locale,
  visible,
  fileInputRef,
  isParsingPdf,
  pdfParseResult,
  newEventId,
  setNewEventId,
  newEventName,
  setNewEventName,
  newSetupPassword,
  setNewSetupPassword,
  newRoundDuration,
  setNewRoundDuration,
  newRestDuration,
  setNewRestDuration,
  newMaxPointGap,
  setNewMaxPointGap,
  newMaxGamjeom,
  setNewMaxGamjeom,
  newIvrQuota,
  setNewIvrQuota,
  courtCount,
  setCourtCount,
  onFileSelect,
  onSubmit,
  onCancel,
}) {
  return (
    <div className="cs-create-modal-overlay">
      <div className="cs-create-modal">
        <h3 className="cs-create-modal-title">
          <FolderPlus size="1.25cqi" />
          <StableLocaleText
            as="span"
            locale={locale}
            visible={visible}
            en="Create Event"
            zh="建立新賽事"
          />
        </h3>
        <form onSubmit={onSubmit} className="cs-create-modal-form">
          <div className="cs-create-modal-pdf">
            <div className="cs-create-modal-pdf-head">
              <FileEarmarkPdf size="1.25cqi" color="#34c759" />
              <StableLocaleText
                as="span"
                locale={locale}
                visible={visible}
                className="cs-create-modal-pdf-title"
                en="Upload PDF (Optional)"
                zh="上傳 PDF 自動建立（選填）"
              />
            </div>
            <StableLocaleText
              as="p"
              locale={locale}
              visible={visible}
              className="cs-create-modal-pdf-desc"
              en="Upload a bracket PDF to auto-fill the event name and import athletes. Multi-day events are split into sub-events automatically."
              zh="上傳對陣表即可自動填充賽事名稱及匯入所有選手資料。如比賽橫跨多日，系統將自動分拆為多個子賽事。"
            />
            <input
              type="file"
              ref={fileInputRef}
              accept="application/pdf"
              style={{ display: "none" }}
              onChange={onFileSelect}
            />
            <Button
              type="button"
              className="cs-create-modal-pdf-btn"
              onClick={() => fileInputRef.current?.click()}
              disabled={isParsingPdf}
              fontSize="0.77cqi"
              angle={60}
              icon={<FileEarmarkArrowUp size="0.83cqi" />}
              style={{ padding: "0.42cqi 0.9cqi", margin: 0 }}
            >
              <StableLocaleText
                as="span"
                locale={locale}
                visible={visible}
                en={isParsingPdf ? "Parsing…" : "Select PDF"}
                zh={isParsingPdf ? "解析中…" : "選擇 PDF"}
              />
            </Button>
            {pdfParseResult && (
              <StableLocaleText
                as="div"
                locale={locale}
                visible={visible}
                className="cs-create-modal-pdf-success"
                en={`✅ Parsed: ${pdfParseResult.matchCount} matches${
                  pdfParseResult.datesList?.length > 1
                    ? ` (${pdfParseResult.datesList.length} dates — will split into multiple events)`
                    : ""
                }`}
                zh={`✅ 成功解析：${pdfParseResult.matchCount} 場比賽${
                  pdfParseResult.datesList?.length > 1
                    ? `（包含 ${pdfParseResult.datesList.length} 個日期，將自動分拆為多個賽事）`
                    : ""
                }`}
              />
            )}
          </div>
          <div className="cs-create-modal-grid cs-create-modal-grid--wide">
            <div className="form-group cs-create-modal-field">
              <StableLocaleText
                as="label"
                locale={locale}
                visible={visible}
                className="cs-create-modal-label"
                en="Event ID"
                zh="賽事識別碼"
              />
              <input
                type="text"
                placeholder={
                  locale === "en"
                    ? "e.g. TKD2026 (unique)"
                    : "例如: TKD2026（不可重複）"
                }
                value={newEventId}
                onChange={(e) => setNewEventId(e.target.value)}
                required
                className="cs-create-modal-input"
              />
            </div>
            <div className="form-group cs-create-modal-field">
              <StableLocaleText
                as="label"
                locale={locale}
                visible={visible}
                className="cs-create-modal-label"
                en="Event Name"
                zh="賽事全稱"
              />
              <input
                type="text"
                placeholder={
                  locale === "en"
                    ? "e.g. 2026 Hong Kong Taekwondo Championships"
                    : "例如: 2026 全港跆拳道錦標賽"
                }
                value={newEventName}
                onChange={(e) => setNewEventName(e.target.value)}
                required
                className="cs-create-modal-input"
              />
            </div>
            <div className="form-group cs-create-modal-field">
              <StableLocaleText
                as="label"
                locale={locale}
                visible={visible}
                className="cs-create-modal-label"
                en="Setup Password"
                zh="設定密碼"
              />
              <input
                type="text"
                placeholder={locale === "en" ? "e.g. BCB2026" : "例如: BCB2026"}
                value={newSetupPassword}
                onChange={(e) => setNewSetupPassword(e.target.value)}
                required
                className="cs-create-modal-input"
              />
            </div>
          </div>
          <div className="cs-create-modal-grid cs-create-modal-grid--pair">
            <div className="form-group cs-create-modal-field">
              <StableLocaleText
                as="label"
                locale={locale}
                visible={visible}
                className="cs-create-modal-label"
                en="Round Duration (sec)"
                zh="回合秒數"
              />
              <input
                type="number"
                value={newRoundDuration}
                onChange={(e) => setNewRoundDuration(e.target.value)}
                className="cs-create-modal-input"
              />
            </div>
            <div className="form-group cs-create-modal-field">
              <StableLocaleText
                as="label"
                locale={locale}
                visible={visible}
                className="cs-create-modal-label"
                en="Rest Duration (sec)"
                zh="休息秒數"
              />
              <input
                type="number"
                value={newRestDuration}
                onChange={(e) => setNewRestDuration(e.target.value)}
                className="cs-create-modal-input"
              />
            </div>
          </div>
          <div className="cs-create-modal-grid cs-create-modal-grid--quad">
            <div className="form-group cs-create-modal-field">
              <StableLocaleText
                as="label"
                locale={locale}
                visible={visible}
                className="cs-create-modal-label"
                en="Point Gap"
                zh="分差"
              />
              <input
                type="number"
                value={newMaxPointGap}
                onChange={(e) => setNewMaxPointGap(e.target.value)}
                className="cs-create-modal-input"
              />
            </div>
            <div className="form-group cs-create-modal-field">
              <StableLocaleText
                as="label"
                locale={locale}
                visible={visible}
                className="cs-create-modal-label"
                en="Max Gam-jeom"
                zh="犯規上限"
              />
              <input
                type="number"
                value={newMaxGamjeom}
                onChange={(e) => setNewMaxGamjeom(e.target.value)}
                className="cs-create-modal-input"
              />
            </div>
            <div className="form-group cs-create-modal-field">
              <StableLocaleText
                as="label"
                locale={locale}
                visible={visible}
                className="cs-create-modal-label"
                en="IVR Quota"
                zh="IVR 配額"
              />
              <input
                type="number"
                min="1"
                placeholder={
                  locale === "en" ? "Empty = unlimited" : "留空 = 無限"
                }
                value={newIvrQuota}
                onChange={(e) => setNewIvrQuota(e.target.value)}
                className="cs-create-modal-input"
              />
            </div>
            <div className="form-group cs-create-modal-field">
              <StableLocaleText
                as="label"
                locale={locale}
                visible={visible}
                className="cs-create-modal-label"
                en="Number of Courts"
                zh="場地數量"
              />
              <input
                type="number"
                min="1"
                max="12"
                placeholder={locale === "en" ? "1–12" : "1–12"}
                value={courtCount}
                onChange={(e) => setCourtCount(e.target.value)}
                required
                className="cs-create-modal-input"
              />
            </div>
          </div>
          <div className="cs-create-modal-actions">
            <Button
              onClick={onCancel}
              fontSize="0.77cqi"
              angle={0}
              icon={<XCircle size="0.83cqi" />}
            >
              <StableLocaleText
                as="span"
                locale={locale}
                visible={visible}
                en="Cancel"
                zh="取消"
              />
            </Button>
            <Button
              type="submit"
              fontSize="0.77cqi"
              angle={120}
              icon={<CheckCircle size="0.83cqi" />}
            >
              <StableLocaleText
                as="span"
                locale={locale}
                visible={visible}
                en="Confirm"
                zh="確認"
              />
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
