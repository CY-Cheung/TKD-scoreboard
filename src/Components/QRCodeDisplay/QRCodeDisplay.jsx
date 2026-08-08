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
          icon={<X size="1.46cqi" />}
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



          {/* Real-time Referee Connection Status Badge Panel */}
          <div
            className={`referee-status-box ${isFull ? "full" : ""}`}
            
          >
            <div className="referee-status-title" style={{ fontSize: "0.94cqi" }}>
              <PeopleFill size="1.04cqi" />
              <span>Referees Connected: {occupiedCount}/3</span>
              {isFull && <CheckCircleFill size="1.04cqi" className="full-icon" />}
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
            <div style={{ display: "flex", flexDirection: "column", gap: "0.52cqi", marginTop: "0.52cqi" }}>
              <Button
                text="Single (單裁判)"
                variant={refereeMode === "single" ? "orange" : "gray"}
                onClick={() => handleModeChange("single")}
                fontSize="1.2cqi"
                style={{ flex: 1 }}
              />
              <Button
                text="Multiple (多裁判)"
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
                  fontSize: "0.72cqi",
                  color: "#ffcc00",
                  marginTop: "0.52cqi",
                }}
              >
                ✓ Valid Point Mode: 2+ judges must agree within 1 second.
              </div>
            )}
            {occupiedCount < 2 && (
              <div
                style={{
                  fontSize: "0.72cqi",
                  color: "#ff3b30",
                  marginTop: "0.52cqi",
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
              gap: "0.78cqi",
            }}
          >
            <div style={{ textAlign: "center", marginBottom: "1.5cqi" }}>
              {(() => {
                const full = eventName || eventId || "N/A";
                const dayMatch = full.match(/(.*?)\s*\(Day (\d+)\)\s*\((\d{4}\/\d{2}\/\d{2})\)/i);
                const formatCourt = (cid) => cid ? cid.toString().replace(/court\s*/i, '').trim() : "N/A";
                
                if (dayMatch) {
                  return (
                    <>
                      <div style={{ fontSize: '1.6cqi', fontWeight: 'bold', color: '#fff' }}>{dayMatch[1].trim()}</div>
                      <div style={{ fontSize: '1.6cqi', fontWeight: 'bold', color: '#fff', marginTop: '0.4cqi' }}>Day {dayMatch[2]} - {dayMatch[3]} - Court {formatCourt(courtId)}</div>
                    </>
                  );
                }
                return (
                    <>
                      <div style={{ fontSize: '1.6cqi', fontWeight: 'bold', color: '#fff' }}>{full}</div>
                      <div style={{ fontSize: '1.6cqi', fontWeight: 'bold', color: '#fff', marginTop: '0.4cqi' }}>Court {formatCourt(courtId)}</div>
                    </>
                );
              })()}
            </div>
            
            <div className="qrcode-wrapper" style={{ width: "55%", aspectRatio: "1" }}>
              <QRCodeSVG
                value={controllerUrl}
                size="100%" style={{ width: '100%', height: '100%' }}
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

          </div>
      </div>
    </div>
  );
}

export default QRCodeDisplay;
