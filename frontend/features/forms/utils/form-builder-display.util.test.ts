import { DateTime } from "luxon";
import { describe, expect, it } from "vitest";
import { getBuilderFieldChipLabel } from "@/features/forms/utils/field-defaults.util";
import { formatFormSavedAgo } from "@/features/forms/utils/form-display.util";

describe("getBuilderFieldChipLabel", () => {
  it("uses the reference canvas labels for common field types", () => {
    expect(getBuilderFieldChipLabel("text")).toBe("Short text");
    expect(getBuilderFieldChipLabel("email")).toBe("Email address");
    expect(getBuilderFieldChipLabel("select")).toBe("Dropdown select");
    expect(getBuilderFieldChipLabel("radio")).toBe("Multiple choice");
  });

  it("falls back to the shared field type label", () => {
    expect(getBuilderFieldChipLabel("phone")).toBe("Phone");
  });
});

describe("formatFormSavedAgo", () => {
  const now = DateTime.fromISO("2026-09-14T18:00:00.000Z");

  it("formats compact saved timestamps", () => {
    expect(formatFormSavedAgo("2026-09-14T17:58:00.000Z", now)).toBe(
      "Saved 2m ago",
    );
    expect(formatFormSavedAgo("2026-09-14T16:00:00.000Z", now)).toBe(
      "Saved 2h ago",
    );
    expect(formatFormSavedAgo("2026-09-14T17:59:40.000Z", now)).toBe(
      "Saved just now",
    );
  });
});
