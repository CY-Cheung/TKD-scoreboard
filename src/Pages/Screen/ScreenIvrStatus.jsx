import React from "react";
import { Files, File, FileExcel } from "react-bootstrap-icons";
import { isIvrUnlimited } from "../../Api";

/** Bottom-bar IVR quota icon for one side. */
export default function ScreenIvrStatus({ remaining }) {
  if (isIvrUnlimited(remaining)) {
    return (
      <div className="screen-ivr-status" aria-label="IVR quota unlimited">
        <Files className="screen-ivr-icon" aria-hidden />
      </div>
    );
  }

  const n = Math.max(0, remaining ?? 0);
  const Icon = n > 1 ? Files : n === 1 ? File : FileExcel;

  return (
    <div className="screen-ivr-status" aria-label={`IVR quota ${n}`}>
      <Icon className="screen-ivr-icon" aria-hidden />
    </div>
  );
}
