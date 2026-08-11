import { describe, it, expect } from "vitest";
import {
  listOrphanEventIds,
  keysFromShallowMap,
  formatOrphanScanSummary,
  ORPHAN_TREE_ROOTS,
} from "./orphanCleanup.js";

describe("keysFromShallowMap", () => {
  it("lists object keys", () => {
    expect(keysFromShallowMap({ a: true, b: 1 })).toEqual(["a", "b"]);
  });

  it("handles empty", () => {
    expect(keysFromShallowMap(null)).toEqual([]);
    expect(keysFromShallowMap(undefined)).toEqual([]);
  });
});

describe("listOrphanEventIds", () => {
  it("flags ids in top-level trees missing from known events", () => {
    const result = listOrphanEventIds({
      knownEventIds: ["TKD1"],
      treeKeys: {
        courts: ["TKD1", "BlackBelt_old"],
        matches: ["TKD1"],
        matchIndex: ["TKD1"],
        matchLive: ["BlackBelt_old", "BCB_old"],
      },
    });
    expect(result.orphanEventIds).toEqual(["BCB_old", "BlackBelt_old"]);
    expect(result.byTree.courts).toEqual(["BlackBelt_old"]);
    expect(result.byTree.matchLive).toEqual(["BCB_old", "BlackBelt_old"]);
    expect(result.byTree.matches).toEqual([]);
  });

  it("returns empty when everything is known", () => {
    const result = listOrphanEventIds({
      knownEventIds: ["e1", "e2"],
      treeKeys: {
        courts: ["e1"],
        matches: ["e2"],
        matchIndex: ["e1"],
        matchLive: ["e2"],
      },
    });
    expect(result.orphanEventIds).toEqual([]);
  });
});

describe("formatOrphanScanSummary", () => {
  it("describes orphans", () => {
    const text = formatOrphanScanSummary({
      orphanEventIds: ["old1"],
      byTree: {
        courts: ["old1"],
        matches: [],
        matchIndex: [],
        matchLive: ["old1"],
      },
    });
    expect(text).toContain("old1");
    expect(text).toContain("courts:");
    expect(text).toContain("matchLive:");
  });

  it("handles clean scan", () => {
    expect(
      formatOrphanScanSummary({ orphanEventIds: [], byTree: {} })
    ).toMatch(/No orphan/i);
  });
});

describe("ORPHAN_TREE_ROOTS", () => {
  it("covers Stage 2–4 top-level trees", () => {
    expect(ORPHAN_TREE_ROOTS).toEqual([
      "courts",
      "matches",
      "matchIndex",
      "matchLive",
    ]);
  });
});
