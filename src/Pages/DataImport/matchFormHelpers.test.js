import { describe, it, expect, vi } from "vitest";
import {
  deriveMatchFormFields,
  deriveFormDefaultsFromEventSettings,
  buildMatchFromForm,
  applyMatchFormFields,
  clearMatchFormCompetitorFields,
  applyEventRuleDefaultsToForm,
} from "./matchFormHelpers.js";

describe("deriveFormDefaultsFromEventSettings", () => {
  it("uses event settings including IVR quota", () => {
    const fields = deriveFormDefaultsFromEventSettings({
      maxPointGap: 12,
      maxGamjeom: 4,
      roundDuration: 100,
      restDuration: 45,
      ivrQuota: 2,
    });
    expect(fields.maxPointGap).toBe(12);
    expect(fields.roundDuration).toBe(100);
    expect(fields.ivrQuota).toBe("2");
    expect(fields.blueName).toBe("");
  });

  it("leaves IVR empty when unlimited / missing", () => {
    expect(deriveFormDefaultsFromEventSettings({}).ivrQuota).toBe("");
    expect(deriveFormDefaultsFromEventSettings({ ivrQuota: -1 }).ivrQuota).toBe("");
  });
});

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

  it("falls back to event settings for missing IVR / rules", () => {
    const fields = deriveMatchFormFields(
      {
        config: {
          rules: {
            maxPointGap: 15,
            maxGamjeom: 5,
            roundDuration: 90,
            restDuration: 60,
          },
          competitors: {
            blue: { name: "A", affiliatedClub: "" },
            red: { name: "B", affiliatedClub: "" },
          },
        },
      },
      { ivrQuota: 3, roundDuration: 100 }
    );
    expect(fields.ivrQuota).toBe("3");
    expect(fields.roundDuration).toBe(90);
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

describe("applyMatchFormFields / clearMatchFormCompetitorFields", () => {
  it("applies and clears via setters", () => {
    const setters = {
      setNextMatchId: vi.fn(),
      setNextMatchSlot: vi.fn(),
      setMaxPointGap: vi.fn(),
      setMaxGamjeom: vi.fn(),
      setRoundDuration: vi.fn(),
      setRestDuration: vi.fn(),
      setIvrQuota: vi.fn(),
      setBlueName: vi.fn(),
      setBlueAffiliatedClub: vi.fn(),
      setBluePreviousMatch: vi.fn(),
      setRedName: vi.fn(),
      setRedAffiliatedClub: vi.fn(),
      setRedPreviousMatch: vi.fn(),
      setMatchId: vi.fn(),
    };
    applyMatchFormFields(
      {
        nextMatchId: "A2",
        nextMatchSlot: "blue",
        maxPointGap: 12,
        maxGamjeom: 4,
        roundDuration: 80,
        restDuration: 50,
        ivrQuota: "",
        blueName: "Ann",
        blueAffiliatedClub: "HK",
        bluePreviousMatch: "",
        redName: "Bob",
        redAffiliatedClub: "",
        redPreviousMatch: "",
      },
      setters
    );
    expect(setters.setBlueName).toHaveBeenCalledWith("Ann");
    clearMatchFormCompetitorFields(setters);
    expect(setters.setMatchId).toHaveBeenCalledWith("");
    expect(setters.setBlueName).toHaveBeenCalledWith("");
    applyEventRuleDefaultsToForm({ ivrQuota: 2, maxPointGap: 12 }, setters);
    expect(setters.setIvrQuota).toHaveBeenCalledWith("2");
    expect(setters.setMaxPointGap).toHaveBeenCalledWith(12);
  });
});
