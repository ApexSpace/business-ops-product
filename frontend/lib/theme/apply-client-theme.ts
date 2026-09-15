import {
  CLIENT_THEME_CSS_VARS,
  type ClientThemeConfig,
  type ClientThemeCssVar,
} from "./types";

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const normalized = hex.replace("#", "").trim();
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return null;
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  };
}

/** Light tint background for primary (e.g. hero metric card). */
function primaryTintFromHex(hex: string): string | null {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  return `color-mix(in srgb, ${hex} 12%, white)`;
}

/** Darker text variant for primary-tint backgrounds. */
function primaryTextFromHex(hex: string): string | null {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  return `color-mix(in srgb, ${hex} 75%, black)`;
}

function translucentMix(
  hex: string,
  ratio: number,
  backdrop: "white" | "transparent" = "transparent",
): string | null {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  return `color-mix(in srgb, ${hex} ${ratio}%, ${backdrop})`;
}

export function applyClientTheme(
  config: ClientThemeConfig | undefined,
  target: HTMLElement = document.documentElement,
): void {
  if (!config) return;

  if (config.primaryColor) {
    target.style.setProperty("--cs-blue", config.primaryColor);
    const tint = primaryTintFromHex(config.primaryColor);
    const text = primaryTextFromHex(config.primaryColor);
    const orb = translucentMix(config.primaryColor, 22);
    const topbarSurface = translucentMix(config.primaryColor, 12, "white");
    if (tint) target.style.setProperty("--cs-blue-tint", tint);
    if (text) target.style.setProperty("--cs-blue-text", text);
    if (orb) {
      target.style.setProperty("--cs-page-orb-1", orb);
      target.style.setProperty("--cs-page-orb-2", orb);
    }
    if (topbarSurface) {
      target.style.setProperty("--cs-shell-topbar-surface", topbarSurface);
    }
  }

  if (config.sidebarColor) {
    target.style.setProperty("--cs-navy", config.sidebarColor);
  }
}

export function clearClientTheme(
  target: HTMLElement = document.documentElement,
  vars: readonly ClientThemeCssVar[] = CLIENT_THEME_CSS_VARS,
): void {
  for (const name of vars) {
    target.style.removeProperty(name);
  }
}

/** Map snapshot branding fields to client theme config. */
export function brandingToClientTheme(
  branding: {
    accentColor?: string;
    productName?: string;
    logoUrl?: string;
    publicPageTitle?: string;
    sidebarColor?: string;
  } | undefined,
): ClientThemeConfig | undefined {
  if (!branding) return undefined;
  const { accentColor, productName, logoUrl, publicPageTitle, sidebarColor } =
    branding;
  if (!accentColor && !sidebarColor && !productName && !logoUrl) {
    return undefined;
  }
  return {
    primaryColor: accentColor,
    sidebarColor,
    productName,
    logoUrl,
    publicPageTitle,
  };
}
