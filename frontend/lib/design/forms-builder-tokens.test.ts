import { describe, expect, it } from "vitest";
import {
  FORMS_BUILDER_CANVAS_CLASS,
  FORMS_BUILDER_CANVAS_COLUMN_CLASS,
  FORMS_BUILDER_CARD_CLASS,
  FORMS_BUILDER_CARD_SELECTED_CLASS,
  FORMS_BUILDER_FIELD_PREVIEW_CLASS,
  FORMS_BUILDER_HEADER_CLASS,
  FORMS_BUILDER_INSERT_BUTTON_CLASS,
  FORMS_BUILDER_SETTINGS_CLASS,
  FORMS_BUILDER_SETTINGS_STACK_CLASS,
  FORMS_BUILDER_SETTINGS_TAB_CLASS,
  FORMS_BUILDER_SHELL_GRID_CLASS,
  FORMS_BUILDER_TYPE_CHIP_CLASS,
} from "@/lib/design/forms-builder-tokens";

describe("forms builder recipes", () => {
  it("sizes the canvas and settings from forms-builder tokens", () => {
    expect(FORMS_BUILDER_CANVAS_COLUMN_CLASS).toContain(
      "--forms-builder-canvas-max-width",
    );
    expect(FORMS_BUILDER_HEADER_CLASS).toContain("--forms-builder-header-height");
    expect(FORMS_BUILDER_SHELL_GRID_CLASS).toContain(
      "--forms-builder-settings-width",
    );
    expect(FORMS_BUILDER_INSERT_BUTTON_CLASS).toContain(
      "--forms-builder-insert-size",
    );
  });

  it("uses shared radius, spacing, and brand surface tokens", () => {
    expect(FORMS_BUILDER_CARD_CLASS).toContain("--radius-card");
    expect(FORMS_BUILDER_CARD_CLASS).toContain("--spacing-5");
    expect(FORMS_BUILDER_CANVAS_CLASS).toContain("bg-violet-primary-surface");
    expect(FORMS_BUILDER_TYPE_CHIP_CLASS).toContain("bg-violet-primary-surface");
    expect(FORMS_BUILDER_FIELD_PREVIEW_CLASS).toContain("--control-height");
    expect(FORMS_BUILDER_SETTINGS_STACK_CLASS).toContain("--spacing-6");
  });

  it("keeps selected chrome on the brand violet border", () => {
    expect(FORMS_BUILDER_CARD_SELECTED_CLASS).toContain(
      "border-violet-primary-normal",
    );
    expect(FORMS_BUILDER_SETTINGS_TAB_CLASS).toContain(
      "data-active:text-violet-primary-normal",
    );
    expect(FORMS_BUILDER_SETTINGS_CLASS).toContain("bg-card");
  });

  it("does not embed hex colors in recipes", () => {
    const recipes = [
      FORMS_BUILDER_CANVAS_CLASS,
      FORMS_BUILDER_CARD_CLASS,
      FORMS_BUILDER_CARD_SELECTED_CLASS,
      FORMS_BUILDER_TYPE_CHIP_CLASS,
      FORMS_BUILDER_FIELD_PREVIEW_CLASS,
    ];
    for (const recipe of recipes) {
      expect(recipe).not.toMatch(/#[0-9a-fA-F]{3,8}/);
    }
  });
});
