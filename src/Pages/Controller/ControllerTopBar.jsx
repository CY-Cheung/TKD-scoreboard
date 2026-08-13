import React from "react";
import Button from "../../Components/Button/Button";
import { ArrowLeft } from "react-bootstrap-icons";

/**
 * Title bar inside 2:1 (Screen top height): Back only.
 * Mode / judge live in the center column.
 */
export default function ControllerTopBar({ onBack }) {
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
    </div>
  );
}
