import { describe, expect, it } from "vitest";
import {
  applyClientTheme,
  brandingToClientTheme,
  clearClientTheme,
} from "./apply-client-theme";

function createStyleTarget(): HTMLElement {
  const properties = new Map<string, string>();
  return {
    style: {
      setProperty(name: string, value: string) {
        properties.set(name, value);
      },
      removeProperty(name: string) {
        properties.delete(name);
        return "";
      },
      getPropertyValue(name: string) {
        return properties.get(name) ?? "";
      },
    },
  } as unknown as HTMLElement;
}

describe("applyClientTheme", () => {
  it("sets primary color CSS variables from config", () => {
    const root = createStyleTarget();
    applyClientTheme({ primaryColor: "#ff0000" }, root);
    expect(root.style.getPropertyValue("--cs-blue")).toBe("#ff0000");
  });

  it("sets sidebar color when provided", () => {
    const root = createStyleTarget();
    applyClientTheme({ sidebarColor: "#001122" }, root);
    expect(root.style.getPropertyValue("--cs-navy")).toBe("#001122");
  });

  it("clears overridden variables", () => {
    const root = createStyleTarget();
    applyClientTheme({ primaryColor: "#ff0000" }, root);
    clearClientTheme(root);
    expect(root.style.getPropertyValue("--cs-blue")).toBe("");
  });
});

describe("brandingToClientTheme", () => {
  it("maps snapshot accentColor to primaryColor", () => {
    expect(
      brandingToClientTheme({ accentColor: "#375BD2" }),
    ).toEqual({ primaryColor: "#375BD2" });
  });

  it("returns undefined when branding is empty", () => {
    expect(brandingToClientTheme({})).toBeUndefined();
    expect(brandingToClientTheme(undefined)).toBeUndefined();
  });
});
