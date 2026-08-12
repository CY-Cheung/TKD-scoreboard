import React from "react";
import Button from "../../Components/Button/Button";
import { Wifi, WifiOff, ArrowLeft } from "react-bootstrap-icons";

/** Top banner: back, event/court/match badges, connection. */
export default function ControllerTopBar({
  eventLabel,
  courtId,
  matchNo,
  mySeat,
  isConnected,
  onBack,
}) {
  return (
    <div className="ctrl-top-bar">
      <Button
        className="ctrl-back-btn"
        onClick={(e) => {
          e.stopPropagation();
          onBack();
        }}
        aria-label="Back"
        icon={<ArrowLeft size={"1.5cqi"} />}
        fontSize="1cqi"
        angle={180}
      />
      <div className="ctrl-info-badges">
        <span className="ctrl-badge">{eventLabel}</span>
        <span className="ctrl-badge court">{courtId || "No Court"}</span>
        <span className="ctrl-badge match">Match #{matchNo}</span>
        {mySeat && (
          <span
            className="ctrl-badge"
            style={{ backgroundColor: "#ffcc00", color: "black" }}
          >
            {mySeat}
          </span>
        )}
      </div>
      <div className="ctrl-conn-status">
        {isConnected ? (
          <span className="conn-connected">
            <Wifi size={16} /> Live
          </span>
        ) : (
          <span className="conn-disconnected">
            <WifiOff size={16} /> Offline
          </span>
        )}
      </div>
    </div>
  );
}
