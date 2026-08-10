import React from "react";
import { FileFontFill, FilePlayFill } from "react-bootstrap-icons";
import Button from "../../Components/Button/Button";
import EditGridLocale from "./EditGridLocale";
import { EDIT_POINT_TYPES } from "./editPointTypes";

/**
 * One competitor row in the Edit scoring grid (side label + IVR + TC + ± points).
 */
function EditSideScoreRow({
  side,
  angle,
  labelEn,
  labelZh,
  locale,
  localeVisible,
  buttonFontSize,
  matchData,
  onIvr,
  onTechCard,
  ivrDisabled,
  techCardDisabled,
  ivrQuotaInput,
  onScoreAction,
}) {
  return (
    <>
      <div className={`grid-cell side-label ${side}`}>
        <EditGridLocale
          locale={locale}
          visible={localeVisible}
          en={labelEn}
          zh={labelZh}
        />
      </div>

      <div className="grid-cell">
        <div className="buttons">
          <Button
            icon={<FilePlayFill color="white" size="2cqi" />}
            fontSize={buttonFontSize}
            onClick={() => onIvr(side)}
            style={{ padding: "0.1cqi 1.2cqi", opacity: ivrDisabled ? 0.3 : 1 }}
            angle={angle}
            disabled={ivrDisabled}
          />
          {ivrQuotaInput}
        </div>
      </div>

      <div className="grid-cell">
        <div className="buttons">
          <Button
            icon={<FileFontFill color="white" size="2cqi" />}
            fontSize={buttonFontSize}
            onClick={() => onTechCard(side)}
            style={{
              padding: "0.1cqi 1.2cqi",
              opacity: techCardDisabled ? 0.3 : 1,
            }}
            angle={angle}
            disabled={techCardDisabled}
          />
        </div>
      </div>

      {EDIT_POINT_TYPES.map((pt) => (
        <div className="grid-cell" key={`${side}-${pt.id}`}>
          <div className="buttons">
            <Button
              text="+"
              fontSize={buttonFontSize}
              style={{ padding: "0.1cqi 1.2cqi", opacity: !matchData ? 0.3 : 1 }}
              onClick={() => onScoreAction(side, pt.type, pt.index, 1)}
              angle={angle}
              disabled={!matchData}
            />
            <Button
              text="−"
              fontSize={buttonFontSize}
              style={{ padding: "0.1cqi 1.2cqi", opacity: !matchData ? 0.3 : 1 }}
              onClick={() => onScoreAction(side, pt.type, pt.index, -1)}
              angle={angle}
              disabled={!matchData}
            />
          </div>
        </div>
      ))}
    </>
  );
}

export default EditSideScoreRow;
