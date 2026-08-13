import React from "react";
import Button from "../../Components/Button/Button";
import { Wifi, WifiOff, ArrowLeft } from "react-bootstrap-icons";

/**
 * Title bar inside 2:1 (Screen top height):
 * Back · Live/Offline (mode/judge live in center column).
 */
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
        icon={<ArrowLeft size={"1.2cqi"} />}
        fontSize="0.95cqi"
        angle={180}
      />

      <div className="ctrl-top-bar-center" aria-hidden="true" />

      <div className="ctrl-conn-status">
        {isConnected ? (
          <span className="conn-connected">
            <Wifi size="1.4cqi" /> Live
          </span>
        ) : (
          <span className="conn-disconnected">
            <WifiOff size="1.4cqi" /> Offline
          </span>
        )}
      </div>
    </div>
  );
}
