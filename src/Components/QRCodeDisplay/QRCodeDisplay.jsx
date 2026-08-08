import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
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
import MarqueeText from "../MarqueeText";
import { ref, onValue, update, set } from "firebase/database";
import { database } from "../../firebase";
import { usePopup } from "../../Context/PopupContext";
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
  const { showConfirm } = usePopup();

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

  return createPortal(
    <div className="qrcode-modal-overlay" onClick={onClose}>
      <div
        className="qrcode-split-card glass-card"
        onClick={(e) => e.stopPropagation()}
      >
        <Button
          className="qrcode-close-corner-btn"
          onClick={onClose}
          aria-label="Close"
          icon={<X size="2cqi" />}
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
            <div className="referee-status-title" style={{ fontSize: "1.8cqi", fontWeight: "bold" }}>
              <PeopleFill size="1.5cqi" />
              <span>Corner Judges Connected: {occupiedCount}/3</span>
              {isFull && <CheckCircleFill size="1.5cqi" className="full-icon" />}
            </div>
            <div className="referee-badges-row">
              {['J1', 'J2', 'J3'].map((slotName, index) => {
                const refData = referees?.[slotName];
                const isConnected = !!refData;
                const deviceName = typeof refData === 'object' && refData !== null 
                    ? refData.deviceName 
                    : (isConnected ? 'Online' : 'Vacant');
                
                const chineseLabel = ['一', '二', '三'][index];

                const handleDisconnect = () => {
                    if (!eventId || !courtId) return;
                    showConfirm({
                        title: 'Force Disconnect (強制斷線)',
                        message: `Are you sure you want to forcefully disconnect Corner Judge ${index + 1}?`,
                        onConfirm: () => {
                            set(ref(database, `events/${eventId}/courts/${courtId}/referees/${slotName}`), null);
                        },
                        confirmText: 'Disconnect',
                        cancelText: 'Cancel'
                    });
                };

                return (
                    <span key={slotName} className={`ref-slot-pill ${isConnected ? "online" : "vacant"}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                        <span>
                            Corner Judge {index + 1} (邊裁{chineseLabel}) {isConnected ? `• ${deviceName} (已連線)` : "• Vacant (空缺)"}
                        </span>
                        <Button 
                            onClick={handleDisconnect}
                            icon={<X size="1.5cqi" />}
                            style={{ padding: '0.2cqi', minHeight: 'unset', marginLeft: '1cqi', borderRadius: '50%' }}
                            variant="red"
                            title={`Disconnect ${slotName}`}
                        />
                    </span>
                );
              })}
            </div>
          </div>

          {/* Referee Mode Selection */}
          <div className="referee-mode-selector">
            <span
              style={{ fontSize: "1.8cqi", color: "#ccc", fontWeight: "bold" }}
            >
              Scoring Mode
            </span>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.52cqi", marginTop: "0.52cqi" }}>
              <Button
                text="Single Corner Judge (一位邊緣裁判)"
                variant={refereeMode === "single" ? "yellow" : "gray"}
                onClick={() => handleModeChange("single")}
                fontSize="1.6cqi"
                style={{ flex: 1 }}
              />
              <Button
                text="Multiple Corner Judges (多位邊緣裁判)"
                variant={refereeMode === "multiple" ? "yellow" : "gray"}
                onClick={() => handleModeChange("multiple")}
                disabled={occupiedCount < 2}
                fontSize="1.6cqi"
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
                  fontSize: "1.1cqi",
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
                  fontSize: "1.2cqi",
                  color: "#ffc107",
                  marginTop: "0.52cqi",
                  textAlign: "center",
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

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
            
            {/* Top Section */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                {(() => {
                  const fullEventName = eventName || eventId || "N/A";
                  let mainEventName = fullEventName;
                  let eventDateStr = '';
                  
                  // Helper to normalize DD/MM/YYYY to YYYY/MM/DD
                  const normalizeDate = (dateStr) => {
                      const ddMMyyyyMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
                      if (ddMMyyyyMatch) {
                          return `${ddMMyyyyMatch[3]}/${ddMMyyyyMatch[2].padStart(2, '0')}/${ddMMyyyyMatch[1].padStart(2, '0')}`;
                      }
                      return dateStr;
                  };
                  
                  const matchDouble = fullEventName.match(/^(.*?)\s*\((Day[^)]+)\)\s*\(([^)]+)\)\s*$/i);
                  if (matchDouble) {
                      mainEventName = matchDouble[1].trim();
                      eventDateStr = `${matchDouble[2].trim()} - ${normalizeDate(matchDouble[3].trim())}`;
                  } else {
                      const matchSingle = fullEventName.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
                      if (matchSingle) {
                          mainEventName = matchSingle[1].trim();
                          eventDateStr = normalizeDate(matchSingle[2].trim());
                      }
                  }
                  
                  return (
                    <div style={{ width: '100%', overflow: 'hidden', textAlign: 'center' }}>
                      <MarqueeText 
                        text={mainEventName} 
                        style={{ fontSize: '2.6cqi', fontWeight: 'bold', color: '#fff', width: '100%' }} 
                      />
                      {eventDateStr && (
                        <div style={{ fontSize: '2.2cqi', fontWeight: 'bold', color: '#fff', marginTop: '0.4cqi' }}>
                          {eventDateStr}
                        </div>
                      )}
                    </div>
                  );
                })()}
          </div>

            {/* Middle Section (QR Code absolutely centered relative to the flex distribution) */}
            <div style={{ flex: 'none', display: 'flex', justifyContent: 'center', position: 'relative' }}>
              <div className="qrcode-wrapper" style={{ width: "65%", aspectRatio: "1" }}>
                <QRCodeSVG
                  value={controllerUrl}
                  size="100%" style={{ width: '100%', height: '100%' }}
                  bgColor="transparent"
                  fgColor="#ffffff"
                  level="H"
                  includeMargin={false}
                />
              </div>
              <div style={{ position: 'absolute', top: '100%', left: '50%', transform: 'translate(-50%, 0)', fontSize: '2.6cqi', fontWeight: 'bold', color: '#fff', marginTop: '0.8cqi', whiteSpace: 'nowrap' }}>
                Court {courtId ? courtId.toString().replace(/court\s*/i, '').trim() : "N/A"}
              </div>
            </div>

            {/* Bottom Section */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center', width: '100%' }}>
              <div className="qrcode-instructions" style={{ textAlign: 'center', width: '100%' }}>
                {isFull ? (
                  <span className="text-warning">
                    ⚠️ 裁判席位已滿 (All 3 Referee Slots Occupied)
                  </span>
                ) : (
                  <div style={{ textAlign: 'center', width: '100%', lineHeight: '1.5' }}>
                    <span style={{ fontSize: '1.4cqi', opacity: 0.9 }}>Scan to instantly become a referee!</span>
                    <br />
                    <span>拿出手機掃描，即刻成為裁判！</span>
                  </div>
                )}
              </div>
            </div>

          </div>

        </div>
      </div>
    </div>,
    document.body
  );
}

export default QRCodeDisplay;
