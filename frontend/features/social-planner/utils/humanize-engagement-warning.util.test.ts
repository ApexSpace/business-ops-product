import { describe, expect, it } from "vitest";
import {
  humanizeEngagementWarning,
  humanizeEngagementWarnings,
} from "./humanize-engagement-warning.util";

describe("humanizeEngagementWarning", () => {
  it("strips YouTube API HTML and maps missing video", () => {
    const raw =
      'youtube:c5PR_dMHJik: The video identified by the <code><a href="/youtube/v3/docs/commentThreads/list#videoId">videoId</a></code> parameter could not be found.';
    expect(humanizeEngagementWarning(raw)).toBe(
      "YouTube: video not found or unavailable.",
    );
  });

  it("dedupes identical humanized messages", () => {
    const raw =
      "youtube:abc: The video identified by the videoId parameter could not be found.";
    expect(humanizeEngagementWarnings([raw, raw])).toEqual([
      "YouTube: video not found or unavailable.",
    ]);
  });
});
