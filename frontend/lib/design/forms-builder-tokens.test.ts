import { describe, expect, it } from "vitest";
import {
  FORM_ACCENT_COLOR_HEX,
  FORMS_BUILDER_EMPTY_CLASS,
  FORMS_BUILDER_FIELD_CARD_SELECTED_CLASS,
  FORMS_BUILDER_PALETTE_ITEM_CLASS,
  FORMS_BUILDER_SHELL_GRID_CLASS,
  FORMS_BUILDER_TITLE_CLASS,
  FORMS_BUILDER_TOPBAR_CLASS,
} from "@/lib/design/forms-builder-tokens";

describe("forms builder recipes", () => {
  it("sizes side panes with the Settings nav width token", () => {
    expect(FORMS_BUILDER_SHELL_GRID_CLASS).toContain("--workspace-nav-width");
  });

  it("uses drawer header chrome and primary/900 titles", () => {
    expect(FORMS_BUILDER_TOPBAR_CLASS).toContain("--drawer-header-border");
    expect(FORMS_BUILDER_TITLE_CLASS).toContain("text-violet-primary-darker");
  });

  it("reuses workspace nav item recipes for palette rows", () => {
    expect(FORMS_BUILDER_PALETTE_ITEM_CLASS).toContain(
      "--workspace-nav-item-height",
    );
    expect(FORMS_BUILDER_PALETTE_ITEM_CLASS).toContain("text-grey-tertiary-normal");
  });

  it("selects canvas fields with brand violet, not generic primary", () => {
    expect(FORMS_BUILDER_FIELD_CARD_SELECTED_CLASS).toContain(
      "border-violet-primary-normal",
    );
    expect(FORMS_BUILDER_FIELD_CARD_SELECTED_CLASS).not.toContain("border-primary");
  });

  it("keeps empty canvas copy-only (no icon box class)", () => {
    expect(FORMS_BUILDER_EMPTY_CLASS).not.toContain("border-dashed");
    expect(FORMS_BUILDER_EMPTY_CLASS).not.toContain("bg-muted");
  });

  it("default accent hex matches --pc-violet-primary-normal", () => {
    expect(FORM_ACCENT_COLOR_HEX).toBe("#7e3bed");
  });
});
