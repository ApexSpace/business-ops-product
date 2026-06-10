import type {
  PlanCardShadow,
  PlanDesignCardWidth,
  PlanDesignColumns,
  PlanFeatureIconSize,
  PlanGroupDesignSettings,
  PlanTextAlignment,
  PlanTierDesignSettings,
  ResolvedPlanGroupDesignSettings,
  ResolvedTierCardStyles,
} from "@/features/platform/types/plan-design-settings";
import type { PlanEmbedSettings } from "@/features/platform/types/plan-group";

const HEX_COLOR_RE = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;

export const FEATURE_LIST_GAP_EM_MIN = 0.1;
export const FEATURE_LIST_GAP_EM_MAX = 1.5;
export const FEATURE_LIST_GAP_EM_DEFAULT = 0.5;
export const FEATURE_LIST_GAP_EM_STEP = 0.05;

const LEGACY_FEATURE_LIST_GAP_EM: Record<string, number> = {
  sm: 0.25,
  md: 0.5,
  lg: 0.75,
};

const LIGHT_DEFAULTS: ResolvedPlanGroupDesignSettings = {
  theme: "light",
  layout: "cards",
  columns: "auto",
  cardWidth: "auto",
  sectionBackgroundColor: "transparent",
  sectionTextColor: "#0f172a",
  sectionMutedTextColor: "#64748b",
  accentColor: "#2563eb",
  fontFamily:
    'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  headingFontSize: "1.875rem",
  bodyFontSize: "0.875rem",
  cardBackgroundColor: "#ffffff",
  cardTextColor: "#0f172a",
  cardBorderColor: "#e2e8f0",
  cardBorderRadius: "16px",
  cardShadow: "sm",
  buttonStyle: "solid",
  buttonBackgroundColor: "#2563eb",
  buttonTextColor: "#ffffff",
  buttonBorderRadius: "10px",
  featureIconStyle: "check",
  featureIconColor: "#ffffff",
  featureIconBackgroundColor: "#eab308",
  featureIconSize: "md",
  showMonthlyYearlyToggle: true,
  showPlanGroupTitle: true,
  showPlanGroupDescription: true,
  showSetupFee: false,
  showTrialDays: false,
  showCapabilities: true,
  showTierFeatures: true,
  showBadges: true,
  showDescriptions: true,
  showFeatureComparison: true,
  tierNameAlignment: "center",
  priceAlignment: "center",
  descriptionAlignment: "center",
  ctaAlignment: "center",
  tierNameBold: true,
  tierNameItalic: false,
  descriptionBold: false,
  descriptionItalic: false,
  priceBold: true,
  priceItalic: false,
  featureListBold: false,
  featureListGap: FEATURE_LIST_GAP_EM_DEFAULT,
  ctaBold: true,
};

const DARK_DEFAULTS: ResolvedPlanGroupDesignSettings = {
  ...LIGHT_DEFAULTS,
  theme: "dark",
  sectionBackgroundColor: "transparent",
  sectionTextColor: "#f8fafc",
  sectionMutedTextColor: "#94a3b8",
  accentColor: "#3b82f6",
  cardBackgroundColor: "#1e293b",
  cardTextColor: "#f8fafc",
  cardBorderColor: "#334155",
  buttonBackgroundColor: "#3b82f6",
  featureIconColor: "#ffffff",
  featureIconBackgroundColor: "#eab308",
};

const FEATURE_ICON_SIZE_PX: Record<PlanFeatureIconSize, string> = {
  sm: "16px",
  md: "20px",
  lg: "24px",
};

export function clampFeatureListGapEm(value: number): number {
  const clamped = Math.min(
    FEATURE_LIST_GAP_EM_MAX,
    Math.max(FEATURE_LIST_GAP_EM_MIN, value),
  );
  return (
    Math.round(clamped / FEATURE_LIST_GAP_EM_STEP) * FEATURE_LIST_GAP_EM_STEP
  );
}

export function parseFeatureListGapEm(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return clampFeatureListGapEm(value);
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed in LEGACY_FEATURE_LIST_GAP_EM) {
      return LEGACY_FEATURE_LIST_GAP_EM[trimmed];
    }
    const parsed = Number(trimmed);
    if (Number.isFinite(parsed)) {
      return clampFeatureListGapEm(parsed);
    }
  }
  return undefined;
}

export function featureIconSizeToPixels(size: PlanFeatureIconSize): string {
  return FEATURE_ICON_SIZE_PX[size];
}

export function featureListGapToCss(gapEm: number): string {
  return `${gapEm}em`;
}

export function formatFeatureListGapEm(gapEm: number): string {
  const normalized = clampFeatureListGapEm(gapEm);
  const formatted = normalized.toFixed(2).replace(/\.?0+$/, "");
  return `${formatted}em`;
}

export function cardWidthToCss(width: PlanDesignCardWidth): string {
  return CARD_WIDTH_VALUES[width];
}

export function cardWidthClass(width: PlanDesignCardWidth): string {
  if (width === "auto" || width === "full") return "w-full justify-self-stretch";
  return "w-full max-w-[var(--plan-card-max-width)] justify-self-center";
}

export function featureIconSizeClasses(size: PlanFeatureIconSize): {
  container: string;
  icon: string;
} {
  if (size === "sm") {
    return { container: "size-4", icon: "size-2.5" };
  }
  if (size === "lg") {
    return { container: "size-6", icon: "size-3.5" };
  }
  return { container: "size-5", icon: "size-3" };
}

const SHADOW_VALUES: Record<PlanCardShadow, string> = {
  none: "none",
  sm: "0 1px 3px rgba(0,0,0,.06)",
  md: "0 4px 12px rgba(0,0,0,.08)",
  lg: "0 8px 24px rgba(0,0,0,.12)",
};

const CARD_WIDTH_VALUES: Record<PlanDesignCardWidth, string> = {
  auto: "none",
  narrow: "280px",
  medium: "360px",
  wide: "480px",
  full: "100%",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function pickFeatureIconSize(value: unknown): PlanFeatureIconSize | undefined {
  if (value === "sm" || value === "md" || value === "lg") return value;
  return undefined;
}

export function sanitizeOptionalHexColor(value?: string | null): string | undefined {
  if (!value?.trim()) return undefined;
  const trimmed = value.trim();
  return HEX_COLOR_RE.test(trimmed) ? trimmed : undefined;
}

function mapEmbedTheme(theme: PlanEmbedSettings["theme"]) {
  if (theme === "DARK") return "dark" as const;
  return "light" as const;
}

function mapEmbedLayout(layout: PlanEmbedSettings["layout"]) {
  if (layout === "COMPARISON") return "comparison" as const;
  return "cards" as const;
}

type PlanEmbedDesignFallback = Pick<
  PlanEmbedSettings,
  | "theme"
  | "layout"
  | "showMonthlyYearlyToggle"
  | "showFeatureComparison"
  | "showSetupFee"
  | "showTrialDays"
  | "showCapabilities"
  | "showTierFeatures"
>;

export function resolvePlanGroupDesignSettings(
  stored?: PlanGroupDesignSettings | null,
  embed?: PlanEmbedDesignFallback | null,
): ResolvedPlanGroupDesignSettings {
  const parsed = stored ?? {};
  const embedTheme = embed ? mapEmbedTheme(embed.theme) : "light";
  const theme = parsed.theme ?? embedTheme;
  const themeBase = theme === "dark" ? DARK_DEFAULTS : LIGHT_DEFAULTS;
  const base = LIGHT_DEFAULTS;

  return {
    theme,
    layout: parsed.layout ?? (embed ? mapEmbedLayout(embed.layout) : "cards"),
    columns: parsed.columns ?? "auto",
    cardWidth: parsed.cardWidth ?? "auto",
    sectionBackgroundColor: "transparent",
    sectionTextColor:
      sanitizeOptionalHexColor(parsed.sectionTextColor) ??
      themeBase.sectionTextColor,
    sectionMutedTextColor:
      sanitizeOptionalHexColor(parsed.sectionMutedTextColor) ??
      themeBase.sectionMutedTextColor,
    accentColor:
      sanitizeOptionalHexColor(parsed.accentColor) ?? themeBase.accentColor,
    fontFamily: parsed.fontFamily?.trim() || base.fontFamily,
    headingFontSize: parsed.headingFontSize?.trim() || base.headingFontSize,
    bodyFontSize: parsed.bodyFontSize?.trim() || base.bodyFontSize,
    cardBackgroundColor:
      sanitizeOptionalHexColor(parsed.cardBackgroundColor) ??
      themeBase.cardBackgroundColor,
    cardTextColor:
      sanitizeOptionalHexColor(parsed.cardTextColor) ?? themeBase.cardTextColor,
    cardBorderColor:
      sanitizeOptionalHexColor(parsed.cardBorderColor) ??
      themeBase.cardBorderColor,
    cardBorderRadius: parsed.cardBorderRadius?.trim() || base.cardBorderRadius,
    cardShadow: parsed.cardShadow ?? base.cardShadow,
    buttonStyle: parsed.buttonStyle ?? base.buttonStyle,
    buttonBackgroundColor:
      sanitizeOptionalHexColor(parsed.buttonBackgroundColor) ??
      themeBase.buttonBackgroundColor,
    buttonTextColor:
      sanitizeOptionalHexColor(parsed.buttonTextColor) ??
      themeBase.buttonTextColor,
    buttonBorderRadius:
      parsed.buttonBorderRadius?.trim() || base.buttonBorderRadius,
    featureIconStyle: parsed.featureIconStyle ?? base.featureIconStyle,
    featureIconColor:
      sanitizeOptionalHexColor(parsed.featureIconColor) ??
      themeBase.featureIconColor,
    featureIconBackgroundColor:
      sanitizeOptionalHexColor(parsed.featureIconBackgroundColor) ??
      themeBase.featureIconBackgroundColor,
    featureIconSize:
      pickFeatureIconSize(parsed.featureIconSize) ?? base.featureIconSize,
    showMonthlyYearlyToggle:
      parsed.showMonthlyYearlyToggle ??
      embed?.showMonthlyYearlyToggle ??
      base.showMonthlyYearlyToggle,
    showPlanGroupTitle:
      parsed.showPlanGroupTitle ?? base.showPlanGroupTitle,
    showPlanGroupDescription:
      parsed.showPlanGroupDescription ?? base.showPlanGroupDescription,
    showSetupFee:
      parsed.showSetupFee ?? embed?.showSetupFee ?? base.showSetupFee,
    showTrialDays:
      parsed.showTrialDays ?? embed?.showTrialDays ?? base.showTrialDays,
    showCapabilities:
      parsed.showCapabilities ??
      embed?.showCapabilities ??
      base.showCapabilities,
    showTierFeatures:
      parsed.showTierFeatures ??
      embed?.showTierFeatures ??
      base.showTierFeatures,
    showBadges: parsed.showBadges ?? base.showBadges,
    showDescriptions: parsed.showDescriptions ?? base.showDescriptions,
    showFeatureComparison:
      parsed.showFeatureComparison ??
      embed?.showFeatureComparison ??
      base.showFeatureComparison,
    tierNameAlignment: parsed.tierNameAlignment ?? base.tierNameAlignment,
    priceAlignment: parsed.priceAlignment ?? base.priceAlignment,
    descriptionAlignment:
      parsed.descriptionAlignment ?? base.descriptionAlignment,
    ctaAlignment: parsed.ctaAlignment ?? base.ctaAlignment,
    tierNameBold: parsed.tierNameBold ?? base.tierNameBold,
    tierNameItalic: parsed.tierNameItalic ?? base.tierNameItalic,
    descriptionBold: parsed.descriptionBold ?? base.descriptionBold,
    descriptionItalic: parsed.descriptionItalic ?? base.descriptionItalic,
    priceBold: parsed.priceBold ?? base.priceBold,
    priceItalic: parsed.priceItalic ?? base.priceItalic,
    featureListBold: parsed.featureListBold ?? base.featureListBold,
    featureListGap:
      parseFeatureListGapEm(parsed.featureListGap) ?? base.featureListGap,
    ctaBold: parsed.ctaBold ?? base.ctaBold,
  };
}

export function textAlignmentClass(alignment: PlanTextAlignment): string {
  if (alignment === "left") return "text-left";
  if (alignment === "right") return "text-right";
  return "text-center";
}

export function flexJustifyClass(alignment: PlanTextAlignment): string {
  if (alignment === "left") return "justify-start";
  if (alignment === "right") return "justify-end";
  return "justify-center";
}

export function alignmentToCssTextAlign(
  alignment: PlanTextAlignment,
): "left" | "center" | "right" {
  return alignment;
}

export function alignmentToCssFlexJustify(
  alignment: PlanTextAlignment,
): "flex-start" | "center" | "flex-end" {
  if (alignment === "left") return "flex-start";
  if (alignment === "right") return "flex-end";
  return "center";
}

export function typographyWeightCss(bold: boolean): string {
  return bold ? "700" : "400";
}

export function typographyStyleCss(italic: boolean): string {
  return italic ? "italic" : "normal";
}

export function resolveTierCardStyles(
  group: ResolvedPlanGroupDesignSettings,
  tierOverrides?: PlanTierDesignSettings | null,
): ResolvedTierCardStyles {
  const accent = group.accentColor;
  const softButtonBg =
    group.theme === "dark" ? "rgba(59,130,246,.15)" : "#dbeafe";

  let buttonBackgroundColor = group.buttonBackgroundColor;
  let buttonTextColor = group.buttonTextColor;

  if (group.buttonStyle === "outline") {
    buttonBackgroundColor = "transparent";
    buttonTextColor = accent;
  } else if (group.buttonStyle === "soft") {
    buttonBackgroundColor = softButtonBg;
    buttonTextColor = accent;
  }

  return {
    cardBackgroundColor:
      sanitizeOptionalHexColor(tierOverrides?.cardBackgroundColor) ??
      group.cardBackgroundColor,
    cardTextColor: group.cardTextColor,
    cardBorderColor: group.cardBorderColor,
    cardBorderRadius: group.cardBorderRadius,
    cardShadow: SHADOW_VALUES[group.cardShadow],
    badgeBackgroundColor: accent,
    badgeTextColor: "#ffffff",
    buttonBackgroundColor,
    buttonTextColor,
    buttonBorderRadius: group.buttonBorderRadius,
    buttonStyle: group.buttonStyle,
    featureIconStyle: group.featureIconStyle,
    featureIconColor: group.featureIconColor,
    featureIconBackgroundColor: group.featureIconBackgroundColor,
    featureIconSize: group.featureIconSize,
    featureListBold: group.featureListBold,
  };
}

export function designSettingsToCssVariables(
  settings: ResolvedPlanGroupDesignSettings,
): Record<string, string> {
  return {
    "--plan-section-bg": "transparent",
    "--plan-section-text": settings.sectionTextColor,
    "--plan-section-muted": settings.sectionMutedTextColor,
    "--plan-accent": settings.accentColor,
    "--plan-font-family": settings.fontFamily,
    "--plan-heading-size": settings.headingFontSize,
    "--plan-body-size": settings.bodyFontSize,
    "--plan-tier-gap": "1.25em",
    "--plan-card-max-width": cardWidthToCss(settings.cardWidth),
    "--plan-card-bg": settings.cardBackgroundColor,
    "--plan-card-text": settings.cardTextColor,
    "--plan-card-border": settings.cardBorderColor,
    "--plan-card-radius": settings.cardBorderRadius,
    "--plan-card-shadow": SHADOW_VALUES[settings.cardShadow],
    "--plan-btn-bg": settings.buttonBackgroundColor,
    "--plan-btn-text": settings.buttonTextColor,
    "--plan-btn-radius": settings.buttonBorderRadius,
    "--plan-feature-icon": settings.featureIconColor,
    "--plan-feature-icon-bg": settings.featureIconBackgroundColor,
    "--plan-feature-icon-size": featureIconSizeToPixels(settings.featureIconSize),
    "--plan-tier-name-align": alignmentToCssTextAlign(settings.tierNameAlignment),
    "--plan-price-align": alignmentToCssTextAlign(settings.priceAlignment),
    "--plan-desc-align": alignmentToCssTextAlign(settings.descriptionAlignment),
    "--plan-cta-justify": alignmentToCssFlexJustify(settings.ctaAlignment),
    "--plan-tier-name-weight": typographyWeightCss(settings.tierNameBold),
    "--plan-tier-name-style": typographyStyleCss(settings.tierNameItalic),
    "--plan-desc-weight": typographyWeightCss(settings.descriptionBold),
    "--plan-desc-style": typographyStyleCss(settings.descriptionItalic),
    "--plan-price-weight": typographyWeightCss(settings.priceBold),
    "--plan-price-style": typographyStyleCss(settings.priceItalic),
    "--plan-feature-list-weight": typographyWeightCss(settings.featureListBold),
    "--plan-feature-list-gap": featureListGapToCss(settings.featureListGap),
    "--plan-cta-weight": typographyWeightCss(settings.ctaBold),
  };
}

export function tierStylesToCssVariables(
  styles: ResolvedTierCardStyles,
): Record<string, string> {
  return {
    "--plan-tier-card-bg": styles.cardBackgroundColor,
  };
}

export function gridColumnsClass(
  columns: PlanDesignColumns,
  tierCount: number,
): string {
  if (columns === "2") return "grid-cols-1 md:grid-cols-2";
  if (columns === "3") return "grid-cols-1 md:grid-cols-2 xl:grid-cols-3";
  if (columns === "4") return "grid-cols-1 sm:grid-cols-2 xl:grid-cols-4";
  if (tierCount <= 1) return "grid-cols-1 max-w-md mx-auto";
  if (tierCount === 2) return "grid-cols-1 md:grid-cols-2";
  if (tierCount === 3) return "grid-cols-1 md:grid-cols-2 xl:grid-cols-3";
  return "grid-cols-1 sm:grid-cols-2 xl:grid-cols-4";
}

export function stripEmptyDesignSettings<T extends Record<string, unknown>>(
  values: T,
): Partial<T> {
  const result: Partial<T> = {};
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined || value === null || value === "") continue;
    if (typeof value === "string" && !value.trim()) continue;
    result[key as keyof T] = value as T[keyof T];
  }
  return result;
}

export function getDefaultStyleFormValues(
  planGroupDesign?: PlanGroupDesignSettings | null,
  embed?: PlanEmbedSettings | null,
): ResolvedPlanGroupDesignSettings {
  return resolvePlanGroupDesignSettings(planGroupDesign, embed);
}

export function isEmptyTierDesignSettings(
  settings?: PlanTierDesignSettings | null,
): boolean {
  if (!settings || !isRecord(settings)) return true;
  return Object.values(settings).every(
    (value) => value === undefined || value === null || value === "",
  );
}
