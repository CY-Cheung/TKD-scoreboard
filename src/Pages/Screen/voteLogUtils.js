/**
 * Build combined pending-vote + successful-score logs for one side.
 * Pure helper — no React / Firebase side effects.
 */
export function buildSideVoteLogs(votes, recentScores, side, now, voteWindowMs) {
  const combinedLogs = [];

  const activeVotes = (votes || []).filter(
    (v) => v.side === side && now - v.timestamp <= voteWindowMs
  );

  const pendingGroups = activeVotes.reduce((acc, v) => {
    if (!acc[v.index]) {
      acc[v.index] = {
        index: v.index,
        seatNames: new Set(),
        timestamp: v.timestamp,
      };
    }
    acc[v.index].seatNames.add(v.seatName);
    // Keep the newest timestamp in the group window (legacy behaviour)
    acc[v.index].timestamp = Math.max(acc[v.index].timestamp, v.timestamp);
    return acc;
  }, {});

  Object.values(pendingGroups).forEach((group) => {
    combinedLogs.push({
      type: "pending",
      index: group.index,
      seatNames: Array.from(group.seatNames),
      timestamp: group.timestamp,
    });
  });

  (recentScores || [])
    .filter((s) => s.side === side)
    .forEach((score) => {
      combinedLogs.push({
        type: "success",
        index: score.index,
        seatNames: score.seatNames,
        timestamp: score.timestamp,
      });
    });

  combinedLogs.sort((a, b) => b.timestamp - a.timestamp);
  return combinedLogs;
}

/**
 * Whether vote-row cells should reverse so the action icon sits
 * toward the score column for the current layout direction.
 */
export function shouldReverseVoteCells(side, direction) {
  return (
    (side === "red" && direction === "row") ||
    (side === "blue" && direction === "row-reverse")
  );
}
