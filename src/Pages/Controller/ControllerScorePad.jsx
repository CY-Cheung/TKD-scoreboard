import React from "react";
import Button from "../../Components/Button/Button";
import { CONTROLLER_SCORE_COLUMNS } from "./controllerScoreActions";

/**
 * Presentational score columns for Controller.
 * Center match panel stays in Controller.jsx between red and blue columns.
 */
function ControllerScorePad({ onScore, children }) {
  const redColumns = CONTROLLER_SCORE_COLUMNS.filter((col) => col.side === "red");
  const blueColumns = CONTROLLER_SCORE_COLUMNS.filter((col) => col.side === "blue");

  const renderColumn = (column) => (
    <div key={column.key} className={column.className}>
      {column.actions.map((action) => (
        <Button
          key={`${column.side}-${action.index}`}
          className={`neon-btn ${column.side}-btn`}
          text={action.text}
          angle={column.angle}
          fontSize="2.5cqi"
          onClick={(e) => {
            e.stopPropagation();
            onScore(column.side, action.index, action.label);
          }}
        />
      ))}
    </div>
  );

  return (
    <>
      {redColumns.map(renderColumn)}
      {children}
      {blueColumns.map(renderColumn)}
    </>
  );
}

export default ControllerScorePad;
