/**
 * Controller score-pad layout: pointsStat index + button labels.
 * Column widths mirror Screen middle row:
 *   log (1/4/6) = 19/150, score (2/3) = 39/150, center info = 34/150.
 */
export const CONTROLLER_SCORE_COLUMNS = [
  {
    key: "red-high",
    side: "red",
    className: "ctrl-col-log red-bg",
    angle: 350,
    actions: [
      { index: 4, text: "Red 6", label: "+6 Turn Head" },
      { index: 3, text: "Red 4", label: "+4 Turn Body" },
      { index: 0, text: "Red 1", label: "+1 Punch" },
    ],
  },
  {
    key: "red-mid",
    side: "red",
    className: "ctrl-col-score red-score-bg",
    angle: 350,
    actions: [
      { index: 2, text: "Red 3", label: "+3 Head" },
      { index: 1, text: "Red 2", label: "+2 Body" },
    ],
  },
  {
    key: "blue-mid",
    side: "blue",
    className: "ctrl-col-score blue-score-bg",
    angle: 210,
    actions: [
      { index: 2, text: "Blue 3", label: "+3 Head" },
      { index: 1, text: "Blue 2", label: "+2 Body" },
    ],
  },
  {
    key: "blue-high",
    side: "blue",
    className: "ctrl-col-log blue-bg",
    angle: 210,
    actions: [
      { index: 4, text: "Blue 6", label: "+6 Turn Head" },
      { index: 3, text: "Blue 4", label: "+4 Turn Body" },
      { index: 0, text: "Blue 1", label: "+1 Punch" },
    ],
  },
];
