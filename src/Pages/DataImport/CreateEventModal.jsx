import React from "react";
import {
  FolderPlus,
  FileEarmarkPdf,
  FileEarmarkArrowUp,
  XCircle,
  CheckCircle,
} from "react-bootstrap-icons";
import Button from "../../Components/Button/Button";

/**
 * Presentational Create Event overlay for DataImport.
 * Firebase / PDF parse handlers stay in the page.
 */
export default function CreateEventModal({
  fileInputRef,
  isParsingPdf,
  pdfParseResult,
  newEventId,
  setNewEventId,
  newEventName,
  setNewEventName,
  newSetupPassword,
  setNewSetupPassword,
  newMaxPointGap,
  setNewMaxPointGap,
  newMaxGamjeom,
  setNewMaxGamjeom,
  newRoundDuration,
  setNewRoundDuration,
  newRestDuration,
  setNewRestDuration,
  newIvrQuota,
  setNewIvrQuota,
  onFileSelect,
  onSubmit,
  onCancel,
}) {
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.75)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          backgroundColor: "#222",
          border: "1px solid rgba(255, 255, 255, 0.2)",
          borderRadius: "0.62cqi",
          padding: "1.3cqi",
          width: "90%",
          maxWidth: "23.4cqi",
          color: "#fff",
          boxShadow: "0 0.42cqi 1.66cqi rgba(0,0,0,0.5)",
        }}
      >
        <h3
          style={{
            marginTop: 0,
            display: "flex",
            alignItems: "center",
            gap: "0.42cqi",
            color: "#FFFF00",
          }}
        >
          <FolderPlus size="1.25cqi" /> Create New Event
        </h3>
        <form
          onSubmit={onSubmit}
          style={{ display: "flex", flexDirection: "column", gap: "0.78cqi" }}
        >
          <div
            style={{
              backgroundColor: "rgba(255,255,255,0.05)",
              padding: "0.78cqi",
              borderRadius: "0.42cqi",
              display: "flex",
              flexDirection: "column",
              gap: "0.52cqi",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.52cqi",
              }}
            >
              <FileEarmarkPdf size="1.25cqi" color="#FFFF00" />
              <span style={{ color: "#fff", fontWeight: "bold" }}>
                上傳 PDF 自動建立 (Optional)
              </span>
            </div>
            <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.68cqi" }}>
              上傳對陣表即可自動填充賽事名稱及匯入所有選手資料。如比賽橫跨多日，系統將自動分拆為多個子賽事。
            </div>
            <input
              type="file"
              ref={fileInputRef}
              accept="application/pdf"
              style={{ display: "none" }}
              onChange={onFileSelect}
            />
            <Button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isParsingPdf}
              text={isParsingPdf ? "Parsing..." : "Select PDF"}
              icon={<FileEarmarkArrowUp size="0.83cqi" />}
              fontSize="0.77cqi"
              angle={60}
            />
            {pdfParseResult && (
              <div
                style={{
                  color: "#4CAF50",
                  fontSize: "0.72cqi",
                  marginTop: "0.26cqi",
                }}
              >
                ✅ 成功解析：{pdfParseResult.matchCount} 場比賽
                {pdfParseResult.datesList?.length > 1 &&
                  ` (包含 ${pdfParseResult.datesList.length} 個日期，將自動分拆為多個賽事)`}
              </div>
            )}
          </div>
          <div className="form-group">
            <label style={{ color: "#ccc" }}>Event ID (賽事識別碼)</label>
            <input
              type="text"
              placeholder="例如: TKD2026 (不可重複)"
              value={newEventId}
              onChange={(e) => setNewEventId(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label style={{ color: "#ccc" }}>Event Name (賽事全稱)</label>
            <input
              type="text"
              placeholder="例如: 2026 全港跆拳道錦標賽"
              value={newEventName}
              onChange={(e) => setNewEventName(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label style={{ color: "#ccc" }}>Setup Password (設定密碼)</label>
            <input
              type="text"
              placeholder="例如: BCB2026"
              value={newSetupPassword}
              onChange={(e) => setNewSetupPassword(e.target.value)}
              required
            />
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "0.52cqi",
            }}
          >
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ color: "#ccc", fontSize: "0.72cqi" }}>
                Point Gap (分差)
              </label>
              <input
                type="number"
                value={newMaxPointGap}
                onChange={(e) => setNewMaxPointGap(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.42cqi",
                  borderRadius: "0.21cqi",
                  border: "1px solid #555",
                  backgroundColor: "#333",
                  color: "#fff",
                }}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ color: "#ccc", fontSize: "0.72cqi" }}>
                Max Gam-jeom (犯規上限)
              </label>
              <input
                type="number"
                value={newMaxGamjeom}
                onChange={(e) => setNewMaxGamjeom(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.42cqi",
                  borderRadius: "0.21cqi",
                  border: "1px solid #555",
                  backgroundColor: "#333",
                  color: "#fff",
                }}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ color: "#ccc", fontSize: "0.72cqi" }}>
                Round Time (回合秒數)
              </label>
              <input
                type="number"
                value={newRoundDuration}
                onChange={(e) => setNewRoundDuration(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.42cqi",
                  borderRadius: "0.21cqi",
                  border: "1px solid #555",
                  backgroundColor: "#333",
                  color: "#fff",
                }}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ color: "#ccc", fontSize: "0.72cqi" }}>
                Rest Time (休息秒數)
              </label>
              <input
                type="number"
                value={newRestDuration}
                onChange={(e) => setNewRestDuration(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.42cqi",
                  borderRadius: "0.21cqi",
                  border: "1px solid #555",
                  backgroundColor: "#333",
                  color: "#fff",
                }}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ color: "#ccc", fontSize: "0.72cqi" }}>
                IVR Quota (留空=無限)
              </label>
              <input
                type="number"
                min="1"
                placeholder="留空 = 無限"
                value={newIvrQuota}
                onChange={(e) => setNewIvrQuota(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.42cqi",
                  borderRadius: "0.21cqi",
                  border: "1px solid #555",
                  backgroundColor: "#333",
                  color: "#fff",
                }}
              />
            </div>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "0.52cqi",
              marginTop: "0.52cqi",
            }}
          >
            <Button
              onClick={onCancel}
              text="Cancel (取消)"
              fontSize="0.77cqi"
              angle={0}
              icon={<XCircle size="0.83cqi" />}
            />
            <Button
              type="submit"
              text="Confirm (確認)"
              fontSize="0.77cqi"
              angle={60}
              icon={<CheckCircle size="0.83cqi" />}
            />
          </div>
        </form>
      </div>
    </div>
  );
}
