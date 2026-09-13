import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { getPipelineStageAccent } from "@/features/pipelines/utils/pipeline-stage-colors";
import type { PipelineStage } from "@/features/pipelines/types";
import { getWorkItemStatusAccent } from "@/features/work-items/utils/work-item-status-colors";

const FRONTEND_ROOT = join(__dirname, "../..");

const TXT_10_FILES = [
  "features/appointments/components/drawer/appointment-detail-drawer.tsx",
  "features/appointments/components/drawer/appointment-client-card.tsx",
  "features/appointments/components/drawer/appointment-service-card.tsx",
  "features/appointments/components/drawer/appointment-status-actions.tsx",
  "features/appointments/components/drawer/appointment-time-block-drawer.tsx",
  "features/appointments/components/drawer/time-block-update-form.tsx",
  "features/appointments/components/appointment-service-line-editor.tsx",
] as const;

const BANNED_TEXT_HEX = [
  "text-[#1A1A1A]",
  "text-[#9A9A9A]",
  "text-[#7E3BED]",
  "text-[#5C2BB5]",
  "text-[#6B6B6B]",
  "placeholder:text-[#9A9A9A]",
] as const;

function source(relativeFromFrontend: string): string {
  return readFileSync(join(FRONTEND_ROOT, relativeFromFrontend), "utf8");
}

describe("TXT-05 calendar staff names and occupancy", () => {
  it("uses dark violet staff names on desktop and mobile, and a token occupancy pill", () => {
    const calendar = source(
      "features/appointments/components/calendar/staff-day-calendar-view.tsx",
    );
    expect(calendar).toContain("text-violet-primary-darker");
    expect(calendar).not.toContain("text-black-secondary-normal");
    expect(calendar).not.toContain("bg-[#7E3BED]");
    expect(calendar).toContain("bg-violet-primary-normal");
    expect(calendar).toContain("--drawer-client-avatar-fg");
  });
});

describe("TXT-10 appointment drawers", () => {
  it("does not paste listed text hex in appointment drawer files", () => {
    for (const relative of TXT_10_FILES) {
      const contents = source(relative);
      for (const hexClass of BANNED_TEXT_HEX) {
        expect(contents, `${relative} still has ${hexClass}`).not.toContain(
          hexClass,
        );
      }
    }
  });

  it("reuses the drawer client-name recipe on the guest card", () => {
    expect(
      source(
        "features/appointments/components/drawer/appointment-client-card.tsx",
      ),
    ).toContain("APPOINTMENT_DRAWER_CLIENT_NAME_CLASS");
  });
});

describe("TXT-15 calendar gutter and list chrome", () => {
  it("replaces gutter and pagination/filter hex with existing tokens", () => {
    expect(
      source(
        "features/appointments/components/calendar/time-grid-shared.tsx",
      ),
    ).toContain("text-[var(--drawer-text-meta)]");
    expect(source("components/ui/list-pagination.tsx")).toContain(
      "text-[var(--drawer-text-secondary)]",
    );
    expect(source("components/ui/list-pagination.tsx")).not.toContain(
      "text-[#8A8A8A]",
    );
    const filters = source("components/layout/list-filters-popover.tsx");
    expect(filters).toContain("text-[var(--drawer-text-body)]");
    expect(filters).toContain("text-violet-primary-dark");
    expect(filters).not.toContain("text-[#4A4A4A]");
    expect(filters).not.toContain("text-[#5F2CB2]");
  });
});

describe("TXT-18 avatar and status leftovers", () => {
  it("maps scheduled work items to semantic status tokens", () => {
    const accent = getWorkItemStatusAccent("SCHEDULED");
    expect(accent.pillClass).toContain("text-primary-text");
    expect(accent.pillClass).not.toContain("hsl(");
    expect(accent.accentColor).toBe("var(--primary)");
  });

  it("maps leftover pipeline hsl accent to existing violet tokens", () => {
    const stage = { type: "OPEN" } as PipelineStage;
    const accent = getPipelineStageAccent(stage, 3);
    expect(accent.pillClass).toContain("text-violet-primary-dark");
    expect(accent.pillClass).not.toContain("hsl(");
    expect(accent.accentColor).toBe("var(--pc-violet-primary-dark)");
  });
});
