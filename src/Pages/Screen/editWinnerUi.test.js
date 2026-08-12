import { describe, it, expect } from "vitest";
import { resolveEditWinnerUi } from "./editWinnerUi.js";

describe("resolveEditWinnerUi", () => {
  it("shows declare when round finished without match winner", () => {
    expect(
      resolveEditWinnerUi({
        phase: "ROUND",
        isFinished: true,
        winReason: "PTG",
        finalWinner: null,
        showSuperiorityVote: false,
      })
    ).toEqual({
      showDeclareWinnerButton: true,
      showPromoteWinnerButton: false,
    });
  });

  it("shows promote when final winner exists", () => {
    expect(
      resolveEditWinnerUi({
        phase: "ROUND",
        isFinished: true,
        winReason: "PTF",
        finalWinner: "red",
        showSuperiorityVote: false,
      })
    ).toEqual({
      showDeclareWinnerButton: false,
      showPromoteWinnerButton: true,
    });
  });
});
