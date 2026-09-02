import { describe, expect, it } from "vitest";
import {
  formatAnyoneAssignmentModeLabel,
  formatAnyoneAssignmentsSummary,
  formatAvoidGapsSummary,
  formatBookingWindowSummary,
  formatCollectPhotosSummary,
} from "./online-booking-settings-labels";

describe("online-booking-settings-labels", () => {
  it("formats booking window summary", () => {
    expect(
      formatBookingWindowSummary({
        maxBookingDays: 90,
        minimumNoticeMinutes: 15,
      }),
    ).toBe(
      "Maximum advance booking (90 days); Minimum prior time required (15 minutes)",
    );
  });

  it("formats avoid gaps summary", () => {
    expect(formatAvoidGapsSummary({ avoidGapsEnabled: true })).toContain(
      "(On)",
    );
    expect(formatAvoidGapsSummary({ avoidGapsEnabled: false })).toContain(
      "(Off)",
    );
  });

  it("formats collect photos summary", () => {
    expect(
      formatCollectPhotosSummary({
        collectPhotosEnabled: false,
        photoUploadPrompt: null,
      }),
    ).toBe("Enabled: No");

    expect(
      formatCollectPhotosSummary({
        collectPhotosEnabled: true,
        photoUploadPrompt: "Upload inspiration photos",
      }),
    ).toContain("Upload inspiration photos");
  });

  it("formats anyone assignments summary", () => {
    const labels = new Map([
      ["u1", "Alex Smith"],
      ["u2", "Jamie Lee"],
    ]);

    expect(formatAnyoneAssignmentModeLabel("RANDOM")).toBe("Randomly");
    expect(formatAnyoneAssignmentModeLabel("ORDER")).toBe("By staff order");

    expect(
      formatAnyoneAssignmentsSummary(
        {
          anyoneAssignmentMode: "RANDOM",
          anyoneExcludedStaffIds: [],
        },
        labels,
      ),
    ).toContain("Excluded staff members: —");

    expect(
      formatAnyoneAssignmentsSummary(
        {
          anyoneAssignmentMode: "ORDER",
          anyoneExcludedStaffIds: ["u1"],
        },
        labels,
      ),
    ).toContain("Alex Smith");
  });
});
