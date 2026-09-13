import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const dashboardDir = dirname(fileURLToPath(import.meta.url));

const CODESOL_NAVY_SLATE = /#12172b|#5b6478|#98a1b5/i;

describe("dashboard ink (TXT-07)", () => {
  const sources = readdirSync(dashboardDir)
    .filter((name) => name.endsWith(".tsx"))
    .map((name) => ({
      name,
      source: readFileSync(join(dashboardDir, name), "utf8"),
    }));

  it("does not use leftover CodeSol navy/slate hex on dashboard cards", () => {
    for (const file of sources) {
      expect(file.source, file.name).not.toMatch(CODESOL_NAVY_SLATE);
    }
  });

  it("maps labels to subtle ink and body to foreground", () => {
    const hero = sources.find((file) => file.name === "hero-metric-card.tsx");
    const shell = sources.find((file) => file.name === "dashboard-card-shell.tsx");
    const overview = sources.find(
      (file) => file.name === "dashboard-overview-hero.tsx",
    );
    expect(hero?.source).toContain("text-foreground-subtle");
    expect(hero?.source).toContain("text-foreground");
    expect(shell?.source).toContain("text-foreground-subtle");
    expect(overview?.source).toContain("text-foreground");
    expect(overview?.source).toContain("text-muted-foreground");
  });
});
