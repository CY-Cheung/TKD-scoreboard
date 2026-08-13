import React from "react";
import Button from "../../Components/Button/Button";
import { CONTROLLER_SCORE_COLUMNS } from "./controllerScoreActions";
import { parseScoreActionLabel } from "./controllerMatchView";

/**
 * Presentational score columns for Controller (Screen middle widths).
 * Center match panel is passed as children between red and blue columns.
 */
function ControllerScorePad({ onScore, children }) {
  const redColumns = CONTROLLER_SCORE_COLUMNS.filter((col) => col.side === "red");
  const blueColumns = CONTROLLER_SCORE_COLUMNS.filter((col) => col.side === "blue");

  const renderColumn = (column) => (
    <div key={column.key} className={column.className}>
      {column.actions.map((action) => {
        const { name, points } = parseScoreActionLabel(action.label);
        return (
          <Button
            key={`${column.side}-${action.index}`}
            className="ctrl-score-btn"
            angle={column.angle}
            fontSize="2.2cqi"
            onClick={(e) => {
              e.stopPropagation();
              onScore(column.side, action.index, action.label);
            }}
          >
            <span className="ctrl-score-btn-inner">
              <span className="ctrl-score-btn-name">{name || action.text}</span>
              <span className="ctrl-score-btn-points">{points}</span>
            </span>
          </Button>
        );
      })}
    </div>
  );

  return (
    <div className="ctrl-middle">
      {redColumns.map(renderColumn)}
      {children}
      {blueColumns.map(renderColumn)}
    </div>
  );
}

export default ControllerScorePad;
