import React from "react";
import {
  Icon1CircleFill,
  Icon2CircleFill,
  Icon3CircleFill,
  Icon1Square,
  Icon2Square,
  Icon3Square,
  Icon1SquareFill,
  Icon2SquareFill,
  Icon3SquareFill,
} from "react-bootstrap-icons";
import PunchIcon from "../../assets/icons/PunchIcon.png";
import { VOTE_WINDOW_MS } from "../../Api";
import { buildSideVoteLogs, shouldReverseVoteCells } from "./voteLogUtils";

const VOTE_STYLE_BY_INDEX = {
  0: {
    numberIcon: Icon1CircleFill,
    numberColor: "#FFFF00",
    isBodyOrHead: false,
  },
  1: {
    numberIcon: Icon1Square,
    numberColor: "#00FFFF",
    isBodyOrHead: true,
    actionIconClass: "trunk-icon",
  },
  2: {
    numberIcon: Icon1SquareFill,
    numberColor: "#00FFFF",
    isBodyOrHead: true,
    actionIconClass: "helmet-icon",
  },
  3: {
    numberIcon: Icon1Square,
    numberColor: "#00FF00",
    isBodyOrHead: true,
    actionIconClass: "trunk-icon",
  },
  4: {
    numberIcon: Icon1SquareFill,
    numberColor: "#00FF00",
    isBodyOrHead: true,
    actionIconClass: "helmet-icon",
  },
};

function getNumberIcon(seat, CompType, color) {
  let RealComp = CompType;
  if (seat === "J1") {
    if (CompType === Icon1CircleFill) RealComp = Icon1CircleFill;
    if (CompType === Icon1Square) RealComp = Icon1Square;
    if (CompType === Icon1SquareFill) RealComp = Icon1SquareFill;
  } else if (seat === "J2") {
    if (CompType === Icon1CircleFill) RealComp = Icon2CircleFill;
    if (CompType === Icon1Square) RealComp = Icon2Square;
    if (CompType === Icon1SquareFill) RealComp = Icon2SquareFill;
  } else if (seat === "J3") {
    if (CompType === Icon1CircleFill) RealComp = Icon3CircleFill;
    if (CompType === Icon1Square) RealComp = Icon3Square;
    if (CompType === Icon1SquareFill) RealComp = Icon3SquareFill;
  }
  return <RealComp size="80%" color={color} />;
}

/**
 * Presentational vote / score log rows for one competitor side.
 */
function VoteLogRows({ side, direction, votes, recentScores, now }) {
  const combinedLogs = buildSideVoteLogs(
    votes,
    recentScores,
    side,
    now,
    VOTE_WINDOW_MS
  );

  return combinedLogs.map((log) => {
    const style = VOTE_STYLE_BY_INDEX[log.index] || VOTE_STYLE_BY_INDEX[0];
    const NumberIconComp = style.numberIcon;
    const numberColor = style.numberColor;
    const isBodyOrHead = style.isBodyOrHead;
    const actionIconClass = style.actionIconClass;
    const opponentColor = side === "red" ? "#0000aa" : "#aa0000";

    const cells = [
      <div key="action" className="vote-cell">
        {isBodyOrHead ? (
          <span className="log-action-icon-glow" style={{ width: "80%", height: "80%" }}>
            <span
              className={actionIconClass}
              style={{
                width: "100%",
                height: "100%",
                backgroundColor: opponentColor,
              }}
            />
          </span>
        ) : (
          <img src={PunchIcon} className="action-logo" alt="Action" />
        )}
      </div>,
      <div key="J1" className="vote-cell">
        {log.seatNames.includes("J1")
          ? getNumberIcon("J1", NumberIconComp, numberColor)
          : null}
      </div>,
      <div key="J2" className="vote-cell">
        {log.seatNames.includes("J2")
          ? getNumberIcon("J2", NumberIconComp, numberColor)
          : null}
      </div>,
      <div key="J3" className="vote-cell">
        {log.seatNames.includes("J3")
          ? getNumberIcon("J3", NumberIconComp, numberColor)
          : null}
      </div>,
    ];

    if (shouldReverseVoteCells(side, direction)) {
      cells.reverse();
    }

    return (
      <div
        key={`${log.type}-${log.timestamp}-${log.index}`}
        className="vote-row"
      >
        {cells}
      </div>
    );
  });
}

export default VoteLogRows;
