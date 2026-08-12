import React from "react";
import Edit from "./Edit";
import QRCodeDisplay from "../../Components/QRCodeDisplay/QRCodeDisplay";
import TechnicalCardAnnouncement from "../../Components/TechnicalCardFlow/TechnicalCardAnnouncement";
import IVRAnnouncement from "../../Components/IVRFlow/IVRAnnouncement";
import ScreenToasts from "./ScreenToasts";
import { getEffectiveIvrRemaining } from "../../Api";

/**
 * Screen overlays: Edit / TC / IVR / QR / toasts.
 * State + handlers stay in Screen.jsx.
 */
export default function ScreenOverlayStack({
  showEdit,
  setShowEdit,
  selectedEvent,
  currentMatchId,
  matchData,
  dominantSide,
  setShowQRCode,
  occupiedRefereesCount,
  toggleDirection,
  toggleKyeShi,
  isKyeShiActive,
  handleTechCardConfirm,
  isTechCardFlowActive,
  handleIvrConfirm,
  isIvrFlowActive,
  eventSettings,
  techCardAnnouncement,
  handleTechCardAnnouncementComplete,
  ivrAnnouncement,
  matchRules,
  handleIvrAnnouncementComplete,
  eventName,
  selectedCourt,
  showQRCode,
  refereesData,
  refereeMode,
  toastMessages,
}) {
  return (
    <>
      <Edit
        visible={showEdit}
        setVisible={setShowEdit}
        eventName={selectedEvent}
        matchId={currentMatchId}
        matchData={matchData}
        dominantSide={dominantSide}
        setShowQRCode={setShowQRCode}
        occupiedRefereesCount={occupiedRefereesCount}
        toggleDirection={toggleDirection}
        toggleKyeShi={toggleKyeShi}
        kyeShiActive={isKyeShiActive}
        onTechCardConfirm={handleTechCardConfirm}
        isTechnicalCardFlowActive={isTechCardFlowActive}
        onIvrConfirm={handleIvrConfirm}
        isIvrFlowActive={isIvrFlowActive}
        eventSettings={eventSettings}
      />

      <TechnicalCardAnnouncement
        visible={techCardAnnouncement !== null}
        side={techCardAnnouncement?.side}
        decision={techCardAnnouncement?.decision}
        startedAt={techCardAnnouncement?.startedAt}
        onComplete={handleTechCardAnnouncementComplete}
      />

      <IVRAnnouncement
        visible={ivrAnnouncement !== null}
        side={ivrAnnouncement?.side}
        decision={ivrAnnouncement?.decision}
        startedAt={ivrAnnouncement?.startedAt}
        ivrRemaining={getEffectiveIvrRemaining(
          matchData?.stats,
          ivrAnnouncement?.side,
          eventSettings,
          matchRules
        )}
        onComplete={handleIvrAnnouncementComplete}
      />

      <QRCodeDisplay
        eventId={selectedEvent}
        eventName={eventName}
        courtId={selectedCourt}
        matchId={currentMatchId}
        visible={showQRCode}
        onClose={() => setShowQRCode(false)}
        refereesData={refereesData}
        refereeMode={refereeMode}
      />

      <ScreenToasts messages={toastMessages} />
    </>
  );
}
