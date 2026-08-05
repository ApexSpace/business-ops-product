import { describe, expect, it } from "vitest";
import { normalizeEngagementResult } from "@/features/social-planner/api/social-planner.api";

describe("normalizeEngagementResult", () => {
  it("never throws when meta is missing (regression for data?.meta.warnings)", () => {
    expect(normalizeEngagementResult(undefined).warnings).toEqual([]);
    expect(normalizeEngagementResult(null).warnings).toEqual([]);
    expect(normalizeEngagementResult([]).warnings).toEqual([]);
    expect(
      normalizeEngagementResult({ items: [] }).warnings,
    ).toEqual([]);
  });

  it("reads flat warnings", () => {
    expect(
      normalizeEngagementResult({
        items: [],
        warnings: ["fb down"],
        unreadCount: 2,
        totalComments: 1,
      }),
    ).toEqual({
      items: [],
      warnings: ["fb down"],
      unreadCount: 2,
      totalComments: 1,
    });
  });

  it("reads legacy nested meta.warnings safely", () => {
    expect(
      normalizeEngagementResult({
        items: [],
        meta: { warnings: ["legacy"], unreadCount: 3, totalComments: 4 },
      }),
    ).toEqual({
      items: [],
      warnings: ["legacy"],
      unreadCount: 3,
      totalComments: 4,
    });
  });
});
