import { describe, it, expect } from "vitest";
import { deriveMatchFormFields, buildMatchFromForm } from "./matchFormHelpers.js";

describe("deriveMatchFormFields", () => {
  it("maps structured competitors", () => {
    const fields = deriveMatchFormFields({
      config: {
        nextMatchId: "A2",
        nextMatchSlot: "blue",
        rules: {
          maxPointGap: 12,
          maxGamjeom: 4,
          roundDuration: 80,
          restDuration: 50,
        },
        competitors: {
          blue: { name: "Ann", affiliatedClub: "HK", previousMatch: "A0" },
          red: { name: "Bob", affiliatedClub: "", previousMatch: null },
        },
      },
    });
    expect(fields.nextMatchId).toBe("A2");
    expect(fields.blueName).toBe("Ann");
    expect(fields.blueAffiliatedClub).toBe("HK");
    expect(fields.redName).toBe("Bob");
    expect(fields.maxPointGap).toBe(12);
  });

  it("parses legacy name(club) when affiliatedClub missing", () => {
    const fields = deriveMatchFormFields({
      config: {
        rules: {},
        competitors: {
          blue: { name: "Ann (ClubA)" },
          red: { name: "Bob" },
        },
      },
    });
    expect(fields.blueName).toBe("Ann");
    expect(fields.blueAffiliatedClub).toBe("ClubA");
  });
});

describe("buildMatchFromForm", () => {
  it("builds a document with competitors and rules", () => {
    const doc = buildMatchFromForm({
      matchId: "M1",
      nextMatchId: "",
      nextMatchSlot: "",
      maxPointGap: "15",
      maxGamjeom: "5",
      roundDuration: "90",
      restDuration: "60",
      ivrQuota: "",
      blueName: "Ann",
      blueAffiliatedClub: "HK",
      bluePreviousMatch: "",
      redName: "Bob",
      redAffiliatedClub: "",
      redPreviousMatch: "",
    });
    expect(doc.config.competitors.blue.name).toBe("Ann");
    expect(doc.config.competitors.red.name).toBe("Bob");
    expect(doc.config.rules.roundDuration).toBe(90);
  });
});
