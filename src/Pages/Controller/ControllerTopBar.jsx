import React from "react";
import Button from "../../Components/Button/Button";
import { Wifi, WifiOff, ArrowLeft } from "react-bootstrap-icons";

/** Minimal top bar: Back + Live/Offline only. */
export default function ControllerTopBar({ isConnected, onBack }) {
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
