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
import { StableLocaleText, useAlternatingLocale } from "../AlternatingLocale/AlternatingLocale";
import { database } from "../../firebase";
import { usePopup } from "../../Context/PopupContext";
import {
  dualSetCourtField,
  dualUpdateCourtField,
  subscribeCourtReferees,
} from "../../services/courtFirebase";
import "./QRCodeDisplay.css";
import Button from "../Button/Button";

function isPhoneUnreachableHost(hostname) {
  if (!hostname) return true;
  if (hostname === "localhost" || hostname === "127.0.0.1") return true;
  if (hostname.endsWith(".agent.cvm.dev") || hostname.endsWith(".cursorvm.com")) {
    return true;
  }
  return false;
}

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
  const { locale, visible: localeVisible } = useAlternatingLocale();

  // Custom Network Host state (for localhost / preview hosts mobile scans)
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

    return subscribeCourtReferees(database, eventId, courtId, (val) =>
      setReferees(val || {})
    );
  }, [eventId, courtId, propRefereesData]);

  if (!visible) return null;

  // Calculate referee slot statuses (J1, J2, J3)
  const isJ1 = !!referees?.J1;
  const isJ2 = !!referees?.J2;
  const isJ3 = !!referees?.J3;
  const occupiedCount = (isJ1 ? 1 : 0) + (isJ2 ? 1 : 0) + (isJ3 ? 1 : 0);
  const isFull = occupiedCount === 3;

  // Detect localhost / Cloud Agent preview (phones often cannot open these)
  const isLocalhost =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1";
  const needsCustomHost =
    isPhoneUnreachableHost(window.location.hostname) || !!customHost.trim();

  // Use custom host if set, otherwise current location host
  const protocol = window.location.protocol;
  const host = customHost.trim() || window.location.host;

  // Extract clean base path for controller QR links
  let basePath = window.location.pathname;
  basePath = basePath.replace(/\/(screen|controller|home)\/?$/, "/");
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
    dualUpdateCourtField(database, eventId, courtId, "config", {
      refereeMode: mode,
    });
  };

  const handleDisconnectAll = () => {
    if (!eventId || !courtId || occupiedCount === 0) return;
    showConfirm({
      title: 'Disconnect All Judges (斷開所有裁判)',
      message: `Are you sure you want to forcefully disconnect all ${occupiedCount} connected corner judge(s)?`,
      onConfirm: () => {
        ['J1', 'J2', 'J3'].forEach(slotName => {
          dualSetCourtField(
            database,
            eventId,
            courtId,
            ["referees", slotName],
            null
          );
        });
      },
      confirmText: 'Disconnect All',
      cancelText: 'Cancel'
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
              <StableLocaleText
                as="span"
                locale={locale}
                visible={localeVisible}
                en="Referee Controller QR Code"
                zh="邊裁控制器 QR 碼"
              />
            </div>
          </div>



          {/* Real-time Referee Connection Status Badge Panel */}
          <div
            className={`referee-status-box ${isFull ? "full" : ""}`}

          >
            <div className="referee-status-title" style={{ fontSize: "1.8cqi", fontWeight: "bold" }}>
              <PeopleFill size="1.5cqi" />
              <StableLocaleText
                as="span"
                locale={locale}
                visible={localeVisible}
                en={`Corner Judges Connected: ${occupiedCount}/3`}
                zh={`已連線邊裁：${occupiedCount}/3`}
              />
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
                            dualSetCourtField(
                              database,
                              eventId,
                              courtId,
                              ["referees", slotName],
                              null
                            );
                        },
                        confirmText: 'Disconnect',
                        cancelText: 'Cancel'
                    });
                };

                return (
                    <span key={slotName} className={`ref-slot-pill ${isConnected ? "online" : "vacant"}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                        <StableLocaleText
                            as="span"
                            locale={locale}
                            visible={localeVisible}
                            en={isConnected
                                ? `Corner Judge ${index + 1} • ${deviceName}`
                                : `Corner Judge ${index + 1} • Vacant`}
                            zh={isConnected
                                ? `邊裁${chineseLabel} • ${deviceName}（已連線）`
                                : `邊裁${chineseLabel} • 空缺`}
                        />
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
            {occupiedCount > 0 && (
              <Button
                variant="red"
                onClick={handleDisconnectAll}
                fontSize="1.4cqi"
                style={{ marginTop: '0.52cqi', width: '100%' }}
              >
                <StableLocaleText as="span" locale={locale} visible={localeVisible} en="Disconnect All" zh="斷開所有" />
              </Button>
            )}
          </div>

          {/* Referee Mode Selection */}
          <div className="referee-mode-selector">
            <StableLocaleText
              as="span"
              locale={locale}
              visible={localeVisible}
              style={{ fontSize: "1.8cqi", color: "#ccc", fontWeight: "bold" }}
              en="Scoring Mode"
              zh="計分模式"
            />
            <div style={{ display: "flex", flexDirection: "column", gap: "0.52cqi", marginTop: "0.52cqi" }}>
              <Button
                variant={refereeMode === "single" ? "yellow" : "gray"}
                onClick={() => handleModeChange("single")}
                fontSize="1.6cqi"
                style={{ flex: 1 }}
              >
                <StableLocaleText as="span" locale={locale} visible={localeVisible} en="Single Corner Judge" zh="一位邊裁" />
              </Button>
              <Button
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
              >
                <StableLocaleText as="span" locale={locale} visible={localeVisible} en="Multiple Corner Judges" zh="多位邊裁" />
              </Button>
            </div>
            {refereeMode === "multiple" && (
              <StableLocaleText
                as="div"
                locale={locale}
                visible={localeVisible}
                style={{
                  fontSize: "1.1cqi",
                  color: "#ffcc00",
                  marginTop: "0.52cqi",
                }}
                en="✓ Valid Point Mode: 2+ judges must agree within 1 second."
                zh="✓ 有效得分模式：至少 2 位邊裁須於 1 秒內一致確認。"
              />
            )}
            {occupiedCount < 2 && (
              <StableLocaleText
                as="div"
                locale={locale}
                visible={localeVisible}
                style={{
                  fontSize: "1.2cqi",
                  color: "#ffc107",
                  marginTop: "0.52cqi",
                  textAlign: "center",
                }}
                en="⚠️ Multiple mode requires at least 2 connected judges."
                zh="⚠️ 多位模式需要至少 2 位已連線邊裁。"
              />
            )}
          </div>
        </div>

        <div className="qrcode-divider"></div>

        {/* Right Panel: QR Code and Config */}
        <div className="qrcode-right-panel">
          {(needsCustomHost || isLocalhost) && (
            <div className="qrcode-host-config" style={{ marginBottom: "0.8cqi" }}>
              <label className="qrcode-host-label">
                <Globe size="1.2cqi" />
                <span>Network Host / IP（手機連線網址）</span>
              </label>
              <input
                type="text"
                className="qrcode-host-input cursor-target"
                placeholder="例: 192.168.1.104:5173 或 cy-cheung.github.io"
                value={customHost}
                onChange={handleHostChange}
              />
              {needsCustomHost && !customHost.trim() && (
                <div className="qrcode-host-warning" style={{ fontSize: "1.1cqi" }}>
                  ⚠️ 而家 host（localhost / Cloud Agent preview）手機多數開唔到。
                  請填 LAN IP（同 Wi‑Fi）或已 deploy 嘅 GitHub Pages host，再掃 QR。
                </div>
              )}
              <div className="qrcode-url-box" style={{ marginTop: "0.5cqi" }}>
                <input
                  className="qrcode-url-input"
                  readOnly
                  value={controllerUrl}
                  title={controllerUrl}
                />
                <Button
                  onClick={handleCopy}
                  icon={copied ? <Check size="1.2cqi" /> : <Copy size="1.2cqi" />}
                  variant="yellow"
                  fontSize="1.2cqi"
                  style={{ padding: "0.4cqi 0.8cqi", minHeight: "unset" }}
                  aria-label="Copy controller URL"
                />
              </div>
            </div>
          )}

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

            {/* Middle Section: QR, Court label, scan instructions */}
            <div className="qrcode-center-column">
              <div className="qrcode-wrapper qrcode-wrapper--compact">
                <QRCodeSVG
                  value={controllerUrl}
                  size="100%" style={{ width: '100%', height: '100%' }}
                  bgColor="transparent"
                  fgColor="#FFFFFF"
                  level="H"
                  includeMargin={false}
                />
              </div>
              <div className="qrcode-court-label">
                <StableLocaleText
                  as="span"
                  locale={locale}
                  visible={localeVisible}
                  en={`Court ${courtId ? courtId.toString().replace(/court\s*/i, '').trim() : "N/A"}`}
                  zh={`場地 ${courtId ? courtId.toString().replace(/court\s*/i, '').trim() : "N/A"}`}
                />
              </div>
              <div className="qrcode-instructions">
                {isFull ? (
                  <StableLocaleText
                    as="span"
                    locale={locale}
                    visible={localeVisible}
                    className="text-warning"
                    en="⚠️ All 3 Referee Slots Occupied"
                    zh="⚠️ 裁判席位已滿"
                  />
                ) : (
                  <StableLocaleText
                    as="div"
                    locale={locale}
                    visible={localeVisible}
                    className="qrcode-scan-copy"
                    en={'Scan this code.\nYour phone is now a score remote.\nNo assembly required.'}
                    zh={'掃呢個碼。\n部手機即刻變裁判手掣。\n唔使裝嵌，唔使說明書。'}
                  />
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
