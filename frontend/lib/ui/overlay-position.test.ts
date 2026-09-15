import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  OVERLAY_SIDE,
  OVERLAY_SIDE_OFFSET,
  SELECT_ALIGN_ITEM_WITH_TRIGGER,
} from "@/lib/ui/overlay-position";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

function source(rel: string) {
  return readFileSync(resolve(root, rel), "utf8");
}

describe("overlay positioning", () => {
  it("opens below the trigger, matching Appointment Client/Service combobox", () => {
    expect(OVERLAY_SIDE).toBe("bottom");
    expect(OVERLAY_SIDE_OFFSET).toBe(4);
    expect(SELECT_ALIGN_ITEM_WITH_TRIGGER).toBe(false);
  });

  it("is the default on Select, Combobox, DropdownMenu, and Popover", () => {
    const select = source("components/ui/select.tsx");
    const combobox = source("components/ui/combobox.tsx");
    const menu = source("components/ui/dropdown-menu.tsx");
    const popover = source("components/ui/popover.tsx");

    expect(select).toContain("side = OVERLAY_SIDE");
    expect(select).toContain("sideOffset = OVERLAY_SIDE_OFFSET");
    expect(select).toContain(
      "alignItemWithTrigger = SELECT_ALIGN_ITEM_WITH_TRIGGER",
    );

    expect(combobox).toContain("side = OVERLAY_SIDE");
    expect(combobox).toContain("sideOffset = OVERLAY_SIDE_OFFSET");

    expect(menu).toContain("side = OVERLAY_SIDE");
    expect(menu).toContain("sideOffset = OVERLAY_SIDE_OFFSET");

    expect(popover).toContain("side = OVERLAY_SIDE");
    expect(popover).toContain("sideOffset = OVERLAY_SIDE_OFFSET");
  });

  it("anchors the navbar user menu to the full trigger, not the chevron", () => {
    const navbar = source("components/shell/dashboard-navbar-actions.tsx");
    expect(navbar).not.toContain("chevronAnchorRef");
    expect(navbar).not.toMatch(/anchor=\{/);
    expect(navbar).toContain('side="bottom"');
  });
});
