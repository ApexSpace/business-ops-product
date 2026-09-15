import { describe, expect, it } from "vitest";
import { DATA_TABLE_FILTER_ICON_CLASS } from "@/lib/design/data-table-tokens";
import {
  DRAWER_CLOSE_ACTION_CLASS,
  DRAWER_HEADER_ACTION_CLASS,
  DRAWER_HEADER_ICON_BUTTON_SLOT_CLASS,
  DRAWER_MOBILE_CLOSE_ACTION_CLASS,
  DRAWER_MOBILE_HEADER_ACTION_CLASS,
} from "@/lib/design/drawer-tokens";
import { FILTER_ICON_BUTTON_CLASS } from "@/lib/ui/control-styles";

describe("icon consistency tokens", () => {
  it("uses one filter button chrome for lists and Appointments", () => {
    expect(DATA_TABLE_FILTER_ICON_CLASS).toBe(FILTER_ICON_BUTTON_CLASS);
    expect(FILTER_ICON_BUTTON_CLASS).toContain("hover:!bg-black/5");
    expect(FILTER_ICON_BUTTON_CLASS).toContain("size-[var(--control-height)]");
  });

  it("keeps drawer header actions identical to close (X)", () => {
    expect(DRAWER_CLOSE_ACTION_CLASS).toBe(DRAWER_HEADER_ACTION_CLASS);
    expect(DRAWER_HEADER_ACTION_CLASS).toContain("--drawer-header-icon-size");
    expect(DRAWER_HEADER_ICON_BUTTON_SLOT_CLASS).toContain("data-icon-button");
    expect(DRAWER_HEADER_ICON_BUTTON_SLOT_CLASS).toContain(
      "--drawer-header-icon-size",
    );
  });

  it("keeps mobile header actions identical to mobile close", () => {
    expect(DRAWER_MOBILE_HEADER_ACTION_CLASS).toBe(
      DRAWER_MOBILE_CLOSE_ACTION_CLASS,
    );
  });
});
