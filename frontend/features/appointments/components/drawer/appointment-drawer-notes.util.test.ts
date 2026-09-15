import { describe, expect, it } from "vitest";
import {
  canCollapseAppointmentFormNotes,
  isAppointmentFormNotesVisible,
} from "./appointment-drawer-notes.util";

describe("appointment drawer notes field", () => {
  it("shows the field after Add Note even when empty", () => {
    expect(isAppointmentFormNotesVisible(true, "")).toBe(true);
  });

  it("keeps filled notes visible without a separate confirm step", () => {
    expect(isAppointmentFormNotesVisible(false, "Bring intake forms")).toBe(
      true,
    );
  });

  it("hides the field until expanded when notes are empty", () => {
    expect(isAppointmentFormNotesVisible(false, "   ")).toBe(false);
  });

  it("allows Cancel only when the notes field is empty", () => {
    expect(canCollapseAppointmentFormNotes("")).toBe(true);
    expect(canCollapseAppointmentFormNotes("  ")).toBe(true);
    expect(canCollapseAppointmentFormNotes("Bring intake forms")).toBe(false);
  });
});
