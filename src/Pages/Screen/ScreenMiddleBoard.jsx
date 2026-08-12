import React from "react";
import VoteLogRows from "./VoteLogRows";
import SideRoundHistory from "./SideRoundHistory";
import ScreenCenterTimer from "./ScreenCenterTimer";

/**
 * Middle scoreboard row: logs + scores + center timer.
 * Does not own rAF / Firebase — parent passes timer handlers.
 */
export default function ScreenMiddleBoard({
  direction,
  matchData,
  now,
  isResting,
  isFinal,
  redScoreColor,
  blueScoreColor,
  redTotalScore,
  blueTotalScore,
  roundScores,
  roundWins,
  onOpenEdit,
  matchNumber,
  kyeShiRemaining,
  displayTime,
  winReason,
  isPaused,
  isMatchLoaded,
  timerColor,
  onToggleDirection,
  onToggleTimer,
}) {
  return (
    <div className="middle" style={{ flexDirection: direction }}>
      <div className="red-log red-bg">
        <div
          className="log-records-container"
          style={{
            flexGrow: 1,
            overflowY: "scroll",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {matchData && (
            <VoteLogRows
              side="red"
              direction={direction}
              votes={matchData.votes}
              recentScores={matchData.recentScores}
              now={now}
            />
          )}
        </div>
      </div>

      <div
        className="red-score-text red-score-bg score-font cursor-target"
        style={{ color: redScoreColor }}
        onClick={onOpenEdit}
      >
        {isResting || isFinal ? (
          <SideRoundHistory
            color="red"
            roundScores={roundScores}
            roundWins={roundWins}
          />
        ) : (
          redTotalScore
        )}
      </div>

      <ScreenCenterTimer
        matchNumber={matchNumber}
        kyeShiRemaining={kyeShiRemaining}
        displayTime={displayTime}
        winReason={winReason}
        isPaused={isPaused}
        isResting={isResting}
        isMatchLoaded={isMatchLoaded}
        timerColor={timerColor}
        onToggleDirection={onToggleDirection}
        onToggleTimer={onToggleTimer}
      />

      <div
        className="blue-score-text blue-score-bg score-font cursor-target"
        style={{ color: blueScoreColor }}
        onClick={onOpenEdit}
      >
        {isResting || isFinal ? (
          <SideRoundHistory
            color="blue"
            roundScores={roundScores}
            roundWins={roundWins}
          />
        ) : (
          blueTotalScore
        )}
      </div>

      <div className="blue-log blue-bg">
        <div
          className="log-records-container"
          style={{
            flexGrow: 1,
            overflowY: "scroll",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {matchData && (
            <VoteLogRows
              side="blue"
              direction={direction}
              votes={matchData.votes}
              recentScores={matchData.recentScores}
              now={now}
            />
          )}
        </div>
      </div>
    </div>
  );
}
