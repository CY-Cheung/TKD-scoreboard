import React from "react";
import { createPortal } from "react-dom";
import { Circle, XLg } from "react-bootstrap-icons";
import { useAnnouncementTiming } from "./useAnnouncementTiming";
import "../QRCodeDisplay/QRCodeDisplay.css";
import "../TechnicalCardFlow/TechnicalCardFlow.css";

function ReturnCardRow({ side }) {
  const sideWord = side === "blue" ? "Blue" : "Red";
  const sideClass = side === "blue" ? "blue" : "red";
  return (
    <div className="tc-row tc-row-3">
      <span>Return card to </span>
      <span className={`tc-command-word ${sideClass}`}>{sideWord}</span>
      <span> Coach</span>
    </div>
  );
}

function GamjeomRow({ side }) {
  if (side === "blue") {
    return (
      <div className="tc-row tc-row-4">
        <span className="tc-command-word blue">Chung</span>
        <span> Gam-jeom</span>
      </div>
    );
  }
  return (
    <div className="tc-row tc-row-4">
      <span className="tc-command-word red">Hung</span>
      <span> Gam-jeom</span>
    </div>
  );
}

/**
 * Shared Screen glass-card announcement for IVR / Technical Card.
 */
function DecisionAnnouncement({
  visible,
  side,
  decision,
  startedAt,
  onComplete,
  title,
  leftIcons,
  extraCardClassName = "",
  showReturnCard = true,
  showGamjeomOnReject = false,
}) {
  const exiting = useAnnouncementTiming({
    visible,
    side,
    decision,
    startedAt,
    onComplete,
  });

  if (!visible || !side || !decision) return null;

  const isAccept = decision === "accept";

  const overlayClass = [
    "qrcode-modal-overlay",
    exiting ? "tc-announce-overlay-exiting" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const cardClass = [
    "qrcode-split-card",
    "glass-card",
    "tc-announce-card",
    extraCardClassName,
    side === "blue" ? "tc-side-blue" : "tc-side-red",
    isAccept ? "tc-decision-accept" : "tc-decision-reject",
  ]
    .filter(Boolean)
    .join(" ");

  return createPortal(
    <div className={overlayClass} style={{ pointerEvents: "none" }}>
      <div className={cardClass} onClick={(e) => e.stopPropagation()}>
        <div className="qrcode-left-panel tc-announce-left">
          <div className="tc-announce-left-inner">
            <div className="tc-announce-icons">{leftIcons}</div>
            <div className="tc-announce-title">{title}</div>
          </div>
        </div>

        <div className="qrcode-divider" />

        <div className="qrcode-right-panel tc-announce-right">
          <div className={`tc-announce-right-inner${isAccept ? "" : " tc-reject-rows"}`}>
            <div className="tc-row tc-row-2">
              {isAccept ? "Request Accepted" : "Request Rejected"}
            </div>
            <div className="tc-announce-status-icon" aria-hidden>
              {isAccept ? <Circle color="#ffffff" /> : <XLg color="#FFFF00" />}
            </div>
            {showReturnCard && <ReturnCardRow side={side} />}
            {!isAccept && showGamjeomOnReject && <GamjeomRow side={side} />}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default DecisionAnnouncement;
