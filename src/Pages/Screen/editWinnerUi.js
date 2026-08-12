/**
 * Pure Edit winner-button visibility.
 */

export function resolveEditWinnerUi({
  phase,
  isFinished,
  winReason,
  finalWinner,
  showSuperiorityVote,
}) {
  const showDeclareWinnerButton =
    phase === "ROUND" &&
    (isFinished || winReason) &&
    !finalWinner &&
    !showSuperiorityVote;
  const showPromoteWinnerButton = Boolean(isFinished && finalWinner);
  return { showDeclareWinnerButton, showPromoteWinnerButton };
}
