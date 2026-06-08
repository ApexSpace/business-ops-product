import { describe, expect, it } from "vitest";
import { resolveDashboardWidgets } from "./resolve-dashboard-widgets";

const resolveLabel = (key: string, fallback: string) => `${key}:${fallback}`;

describe("resolveDashboardWidgets", () => {
  it("skips unknown widget keys and hidden widgets", () => {
    const widgets = resolveDashboardWidgets(
      [
        { key: "contacts", order: 0 },
        { key: "not-real", order: 5 },
        { key: "leads", order: 10, visible: false },
        { key: "pipelines", order: 20 },
      ],
      resolveLabel,
    );

    expect(widgets.map((w) => w.key)).toEqual(["contacts", "pipelines"]);
  });

  it("sorts widgets by configured order", () => {
    const widgets = resolveDashboardWidgets(
      [
        { key: "pipelines", order: 30 },
        { key: "contacts", order: 10 },
        { key: "leads", order: 20 },
      ],
      resolveLabel,
    );

    expect(widgets.map((w) => w.key)).toEqual(["contacts", "leads", "pipelines"]);
  });

  it("resolves labels via terminology helper", () => {
    const widgets = resolveDashboardWidgets(
      [{ key: "contacts", order: 0 }],
      resolveLabel,
    );

    expect(widgets[0].label).toBe("entities.contact.plural:contacts");
  });

  it("returns no widgets when config is empty or missing", () => {
    expect(resolveDashboardWidgets([], resolveLabel)).toEqual([]);
    expect(resolveDashboardWidgets(undefined, resolveLabel)).toEqual([]);
  });
});
