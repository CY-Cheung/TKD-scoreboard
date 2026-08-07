import React, { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  QrCode,
  X,
  Copy,
  Check,
  PeopleFill,
  CheckCircleFill,
  Globe,
} from "react-bootstrap-icons";
import { ref, onValue, update } from "firebase/database";
import { database } from "../../firebase";
import "./QRCodeDisplay.css";
import Button from "../Button/Button";

function QRCodeDisplay({
  eventId,
  eventName,
  courtId,
  visible,
  onClose,
  refereesData: propRefereesData,
  refereeMode = "single",
}) {
  const [copied, setCopied] = useState(false);
  const [referees, setReferees] = useState(propRefereesData || {});

  // Custom Network Host state (for localhost dev environment mobile scans)
  const [customHost, setCustomHost] = useState(() => {
    return localStorage.getItem("qrCustomHost") || "";
  });

  // If propRefereesData is not provided, listen to Firebase directly
  useEffect(() => {
    if (propRefereesData) {
      setReferees(propRefereesData);
      return;
    }

    if (!eventId || !courtId) return;

    const refereesRef = ref(
      database,
      `events/${eventId}/courts/${courtId}/referees`,
    );
    const unsubscribe = onValue(refereesRef, (snapshot) => {
      setReferees(snapshot.val() || {});
    });

    return () => unsubscribe();
  }, [eventId, courtId, propRefereesData]);

  if (!visible) return null;

  // Calculate referee slot statuses (J1, J2, J3)
  const isJ1 = !!referees?.J1;
  const isJ2 = !!referees?.J2;
  const isJ3 = !!referees?.J3;
  const occupiedCount = (isJ1 ? 1 : 0) + (isJ2 ? 1 : 0) + (isJ3 ? 1 : 0);
  const isFull = occupiedCount === 3;

  // Detect localhost
  const isLocalhost =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1";

  // Use custom host if set, otherwise current location host
  const protocol = window.location.protocol;
  const host = customHost.trim() || window.location.host;

  // Extract clean base path
  let basePath = window.location.pathname;
  if (basePath.includes("/screen")) {
    basePath = basePath.replace(/\/screen\/?$/, "/");
  } else if (basePath.includes("/controller")) {
    basePath = basePath.replace(/\/controller\/?$/, "/");
  }
  if (!basePath.endsWith("/")) {
    basePath += "/";
  }

  // Build default BrowserRouter controller URL
  let controllerUrl = `${protocol}//${host}${basePath}controller?event=${encodeURIComponent(eventId || "")}&court=${encodeURIComponent(courtId || "")}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(controllerUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleHostChange = (e) => {
    const value = e.target.value;
    setCustomHost(value);
    localStorage.setItem("qrCustomHost", value);
  };

  const handleModeChange = (mode) => {
    if (mode === "multiple" && occupiedCount < 2) return;
    update(ref(database, `events/${eventId}/courts/${courtId}/config`), {
      refereeMode: mode,
    });
  };

  return (
    <div className="qrcode-modal-overlay" onClick={onClose}>
      <div
        className="qrcode-split-card glass-card"
        onClick={(e) => e.stopPropagation()}
      >
        <Button
          className="qrcode-close-corner-btn"
          onClick={onClose}
          aria-label="Close"
          icon={<X size={28} />}
          variant="orange"
          angle={45}
        />

        {/* Left Panel: Referee Status and Mode */}
        <div className="qrcode-left-panel">
          <div className="qrcode-header">
            <div className="qrcode-title">
              <QrCode className="qrcode-icon" />
              <span>Referee Controller QR Code</span>
            </div>
          </div>

          <div className="qrcode-info" style={{ marginTop: "10px", display: "flex", flexWrap: "wrap", gap: "8px" }}>
            <span className="qrcode-badge">
              {(() => {
                const full = eventName || eventId || "N/A";
                const dayMatch = full.match(/(.*?)\s*(\(Day \d+\)\s*\(\d{4}\/\d{2}\/\d{2}\))/i);
                if (dayMatch) {
                  return (
                    <>
                      Event:<br/>
                      <span style={{ fontSize: '1.05em', display: 'inline-block', margin: '3px 0' }}>{dayMatch[1].trim()}</span><br/>
                      <span style={{ fontSize: '0.85em', opacity: 0.8 }}>{dayMatch[2].trim()}</span>
                    </>
                  );
                }
                return `Event: ${full}`;
              })()}
            </span>
            <span className="qrcode-badge court" style={{ height: "fit-content" }}>
              Court: {courtId || "N/A"}
            </span>
          </div>

          {/* Real-time Referee Connection Status Badge Panel */}
          <div
            className={`referee-status-box ${isFull ? "full" : ""}`}
            style={{ marginTop: "auto", marginBottom: "auto" }}
          >
            <div className="referee-status-title" style={{ fontSize: "1.1rem" }}>
              <PeopleFill size={20} />
              <span>Referees Connected: {occupiedCount}/3</span>
              {isFull && <CheckCircleFill size={20} className="full-icon" />}
            </div>
            <div className="referee-badges-row">
              <span className={`ref-slot-pill ${isJ1 ? "online" : "vacant"}`}>
                J1 {isJ1 ? "• Online" : "• Vacant"}
              </span>
              <span className={`ref-slot-pill ${isJ2 ? "online" : "vacant"}`}>
                J2 {isJ2 ? "• Online" : "• Vacant"}
              </span>
              <span className={`ref-slot-pill ${isJ3 ? "online" : "vacant"}`}>
                J3 {isJ3 ? "• Online" : "• Vacant"}
              </span>
            </div>
          </div>

          {/* Referee Mode Selection */}
          <div className="referee-mode-selector">
            <span
              style={{ fontSize: "1.4cqi", color: "#ccc", fontWeight: "bold" }}
            >
              Scoring Mode
            </span>
            <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
              <Button
                text="Single Referee"
                variant={refereeMode === "single" ? "orange" : "gray"}
                onClick={() => handleModeChange("single")}
                fontSize="1.2cqi"
                style={{ flex: 1 }}
              />
              <Button
                text="Multiple Referees"
                variant={refereeMode === "multiple" ? "orange" : "gray"}
                onClick={() => handleModeChange("multiple")}
                disabled={occupiedCount < 2}
                fontSize="1.2cqi"
                style={{ flex: 1, opacity: occupiedCount < 2 ? 0.5 : 1 }}
                title={
                  occupiedCount < 2
                    ? "Requires at least 2 referees"
                    : "2 or more referees must agree within 1 second to score"
                }
              />
            </div>
            {refereeMode === "multiple" && (
              <div
                style={{
                  fontSize: "0.85rem",
                  color: "#ffcc00",
                  marginTop: "10px",
                }}
              >
                ✓ Valid Point Mode: 2+ judges must agree within 1 second.
              </div>
            )}
            {occupiedCount < 2 && (
              <div
                style={{
                  fontSize: "0.85rem",
                  color: "#ff3b30",
                  marginTop: "10px",
                }}
              >
                ⚠️ Multiple mode requires at least 2 connected judges.
              </div>
            )}
          </div>
        </div>

        <div className="qrcode-divider"></div>

        {/* Right Panel: QR Code and Config */}
        <div className="qrcode-right-panel">
          {/* Network Host Config Section (Removed) */}

          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "15px",
            }}
          >
            <div className="qrcode-wrapper">
              <QRCodeSVG
                value={controllerUrl}
                size={220}
                bgColor="transparent"
                fgColor="#000000"
                level="H"
                includeMargin={false}
              />
            </div>
            <p className="qrcode-instructions">
              {isFull ? (
                <span className="text-warning">
                  ⚠️ 裁判席位已滿 (All 3 Referee Slots Occupied)
                </span>
              ) : (
                "請裁判使用手機掃描二維碼開啟控制頁面"
              )}
            </p>
          </div>

          <div className="qrcode-url-box">
            <input
              type="text"
              readOnly
              value={controllerUrl}
              className="qrcode-url-input cursor-target"
            />
            <Button
              className="qrcode-copy-btn"
              onClick={handleCopy}
              icon={
                copied ? (
                  <Check size={18} color="#4cd964" />
                ) : (
                  <Copy size={18} />
                )
              }
              text={copied ? "已複製" : "複製"}
              fontSize="0.9rem"
              angle={120}
              style={{ padding: "6px 15px" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default QRCodeDisplay;
