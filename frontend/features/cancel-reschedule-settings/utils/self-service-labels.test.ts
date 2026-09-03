import { describe, expect, it } from "vitest";
import {
  decodeSelfCancellationValue,
  encodeSelfCancellationValue,
  formatSelfCancellationSummary,
  stripHtmlToPlainText,
} from "./self-service-labels";

describe("self-service-labels", () => {
  it("encodes and decodes hours-before cancellation", () => {
    const encoded = encodeSelfCancellationValue({
      selfCancellationMode: "UNTIL_HOURS_BEFORE_APPOINTMENT",
      selfCancellationHoursBefore: 24,
    });
    expect(encoded).toBe("UNTIL_HOURS_BEFORE:24");
    expect(decodeSelfCancellationValue(encoded)).toEqual({
      selfCancellationMode: "UNTIL_HOURS_BEFORE_APPOINTMENT",
      selfCancellationHoursBefore: 24,
    });
  });

  it("formats self-cancellation summary labels", () => {
    expect(
      formatSelfCancellationSummary({
        selfCancellationMode: "WITHIN_MINUTES_OF_ONLINE_BOOKING",
        selfCancellationMinutes: 15,
        selfCancellationHoursBefore: 24,
      }),
    ).toBe("Only within 15 minutes of booking online");
  });

  it("strips html for plain summaries", () => {
    expect(stripHtmlToPlainText("<p>Late fee <strong>applies</strong></p>")).toBe(
      "Late fee applies",
    );
  });
});
