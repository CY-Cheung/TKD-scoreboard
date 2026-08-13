import React from "react";

/** Screen-like top red/blue name strip. */
export default function ControllerNamesBar({ redName, blueName }) {
  return (
    <div className="top">
      <div className="red-name red-bg name-font" title={redName}>
        {redName}
      </div>
      <div className="blue-name blue-bg name-font" title={blueName}>
        {blueName}
      </div>
    </div>
  );
}
