import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { QRCodeSVG } from "qrcode.react";
import { QrCode, X } from "react-bootstrap-icons";
import { StableLocaleText, useAlternatingLocale } from "../AlternatingLocale/AlternatingLocale";
import { database } from "../../firebase";
import { usePopup } from "../../Context/PopupContext";
import {
  setCourtField,
  updateCourtField,
  subscribeCourtReferees,
} from "../../services/courtFirebase";
import {
  REFEREE_SEAT_ORDER,
  filterLiveReferees,
} from "../../Pages/Controller/seatGrab";
import { buildControllerQrUrl } from "./controllerQrUrl";
import {
  summarizeRefereeOccupancy,
  canEnableMultipleRefereeMode,
  formatCourtDisplayId,
  readStoredCustomHost,
  writeStoredCustomHost,
} from "./qrRefereeView";
import { getQrHostFlags } from "./qrHostFlags";
import RefereeStatusPanel from "./RefereeStatusPanel";
import RefereeModeSelector from "./RefereeModeSelector";
import QrHostConfig from "./QrHostConfig";
import QrEventHeading from "./QrEventHeading";
import Button from "../Button/Button";
import "./QRCodeDisplay.css";

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
  const [customHost, setCustomHost] = useState(() => readStoredCustomHost());

  useEffect(() => {
    if (propRefereesData) {
      setReferees(propRefereesData);
      return;
    }

    if (!eventId || !courtId) return;

    return subscribeCourtReferees(database, eventId, courtId, (val) =>
      setReferees(filterLiveReferees(val || {}))
    );
  }, [eventId, courtId, propRefereesData]);

  if (!visible) return null;

  const { occupiedCount, isFull } = summarizeRefereeOccupancy(referees);
  const { isLocalhost, usingUnreachableDefault, needsCustomHost } =
    getQrHostFlags(window.location.hostname, customHost);

  const controllerUrl = buildControllerQrUrl({
    eventId,
    courtId,
    hostname: window.location.hostname,
    hostWithPort: window.location.host,
    protocol: window.location.protocol,
    pathname: window.location.pathname,
    customHost,
  });

  const courtDisplayId = formatCourtDisplayId(courtId);

  const handleCopy = () => {
    navigator.clipboard.writeText(controllerUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleHostChange = (e) => {
    const value = e.target.value;
    setCustomHost(value);
    writeStoredCustomHost(value);
  };

  const handleModeChange = (mode) => {
    if (mode === "multiple" && !canEnableMultipleRefereeMode(occupiedCount)) {
      return;
    }
    updateCourtField(database, eventId, courtId, "config", {
      refereeMode: mode,
    });
  };

  const clearSeat = (slotName) => {
    setCourtField(database, eventId, courtId, ["referees", slotName], null);
  };

  const handleDisconnectSlot = (slotName, index) => {
    if (!eventId || !courtId) return;
    showConfirm({
      title: "Force Disconnect (強制斷線)",
      message: `Are you sure you want to forcefully disconnect Corner Judge ${index + 1}?`,
      onConfirm: () => clearSeat(slotName),
      confirmText: "Disconnect",
      cancelText: "Cancel",
    });
  };

  const handleDisconnectAll = () => {
    if (!eventId || !courtId || occupiedCount === 0) return;
    showConfirm({
      title: "Disconnect All Judges (斷開所有裁判)",
      message: `Are you sure you want to forcefully disconnect all ${occupiedCount} connected corner judge(s)?`,
      onConfirm: () => {
        REFEREE_SEAT_ORDER.forEach((slotName) => clearSeat(slotName));
      },
      confirmText: "Disconnect All",
      cancelText: "Cancel",
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

          <RefereeStatusPanel
            locale={locale}
            localeVisible={localeVisible}
            referees={referees}
            occupiedCount={occupiedCount}
            isFull={isFull}
            onDisconnectSlot={handleDisconnectSlot}
            onDisconnectAll={handleDisconnectAll}
          />

          <RefereeModeSelector
            locale={locale}
            localeVisible={localeVisible}
            refereeMode={refereeMode}
            occupiedCount={occupiedCount}
            onModeChange={handleModeChange}
          />
        </div>

        <div className="qrcode-divider"></div>

        <div className="qrcode-right-panel">
          {(needsCustomHost || isLocalhost) && (
            <QrHostConfig
              customHost={customHost}
              onHostChange={handleHostChange}
              controllerUrl={controllerUrl}
              usingUnreachableDefault={usingUnreachableDefault}
              copied={copied}
              onCopy={handleCopy}
            />
          )}

          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              height: "100%",
            }}
          >
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <QrEventHeading eventName={eventName} eventId={eventId} />
            </div>

            <div className="qrcode-center-column">
              <div className="qrcode-wrapper qrcode-wrapper--compact">
                <QRCodeSVG
                  value={controllerUrl}
                  size="100%"
                  style={{ width: "100%", height: "100%" }}
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
                  en={`Court ${courtDisplayId}`}
                  zh={`場地 ${courtDisplayId}`}
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
                    en={
                      "Scan this code.\nYour phone is now a score remote.\nNo assembly required."
                    }
                    zh={
                      "掃呢個碼。\n部手機即刻變裁判手掣。\n唔使裝嵌，唔使說明書。"
                    }
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
