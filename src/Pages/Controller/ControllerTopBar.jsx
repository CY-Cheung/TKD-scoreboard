import React from "react";
import Button from "../../Components/Button/Button";
import { Wifi, WifiOff, ArrowLeft } from "react-bootstrap-icons";
import { formatRefereeModeBadge } from "./controllerMatchView";

/**
 * Title bar inside 2:1 (Screen top height):
 * Back · Judge seat · Live/Offline
 */
export default function ControllerTopBar({
  isConnected,
  onBack,
  mySeat,
  refereeMode,
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
        icon={<ArrowLeft size={"1.2cqi"} />}
        fontSize="0.95cqi"
        angle={180}
      />

      <div className="ctrl-top-bar-center">
        <span className="ctrl-top-judge">
          {formatRefereeModeBadge(refereeMode)} · {mySeat || "..."}
        </span>
      </div>

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
