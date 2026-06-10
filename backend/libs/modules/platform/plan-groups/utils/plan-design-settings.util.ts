import {
  PlanEmbedLayout,
  PlanEmbedSettings,
  PlanEmbedTheme,
} from '@prisma/client';
import {
  PlanButtonStyle,
  PlanCardShadow,
  PlanDesignCardWidth,
  PlanDesignColumns,
  PlanDesignLayout,
  PlanDesignTheme,
  PlanFeatureIconSize,
  PlanFeatureIconStyle,
  PlanGroupDesignSettings,
  PlanTextAlignment,
  PlanTierDesignSettings,
  ResolvedPlanGroupDesignSettings,
  ResolvedTierCardStyles,
} from '../types/plan-design-settings.types';

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
  theme: 'light',
  layout: 'cards',
  columns: 'auto',
  cardWidth: 'auto',
  sectionBackgroundColor: 'transparent',
  sectionTextColor: '#0f172a',
  sectionMutedTextColor: '#64748b',
  accentColor: '#2563eb',
  fontFamily:
    'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  headingFontSize: '1.875rem',
  bodyFontSize: '0.875rem',
  cardBackgroundColor: '#ffffff',
  cardTextColor: '#0f172a',
  cardBorderColor: '#e2e8f0',
  cardBorderRadius: '16px',
  cardShadow: 'sm',
  buttonStyle: 'solid',
  buttonBackgroundColor: '#2563eb',
  buttonTextColor: '#ffffff',
  buttonBorderRadius: '10px',
  featureIconStyle: 'check',
  featureIconColor: '#ffffff',
  featureIconBackgroundColor: '#eab308',
  featureIconSize: 'md',
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
  tierNameAlignment: 'center',
  priceAlignment: 'center',
  descriptionAlignment: 'center',
  ctaAlignment: 'center',
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
  theme: 'dark',
  sectionBackgroundColor: 'transparent',
  sectionTextColor: '#f8fafc',
  sectionMutedTextColor: '#94a3b8',
  accentColor: '#3b82f6',
  cardBackgroundColor: '#1e293b',
  cardTextColor: '#f8fafc',
  cardBorderColor: '#334155',
  buttonBackgroundColor: '#3b82f6',
  featureIconColor: '#ffffff',
  featureIconBackgroundColor: '#eab308',
};

const FEATURE_ICON_SIZE_PX: Record<PlanFeatureIconSize, string> = {
  sm: '16px',
  md: '20px',
  lg: '24px',
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
  if (typeof value === 'number' && Number.isFinite(value)) {
    return clampFeatureListGapEm(value);
  }
  if (typeof value === 'string') {
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

const SHADOW_VALUES: Record<PlanCardShadow, string> = {
  none: 'none',
  sm: '0 1px 3px rgba(0,0,0,.06)',
  md: '0 4px 12px rgba(0,0,0,.08)',
  lg: '0 8px 24px rgba(0,0,0,.12)',
};

const CARD_WIDTH_VALUES: Record<PlanDesignCardWidth, string> = {
  auto: 'none',
  narrow: '280px',
  medium: '360px',
  wide: '480px',
  full: '100%',
};

export function cardWidthToCss(width: PlanDesignCardWidth): string {
  return CARD_WIDTH_VALUES[width];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function sanitizeOptionalHexColor(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return HEX_COLOR_RE.test(trimmed) ? trimmed : undefined;
}

function pickEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
): T | undefined {
  if (typeof value !== 'string') return undefined;
  return allowed.includes(value as T) ? (value as T) : undefined;
}

function pickString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

function mapEmbedTheme(theme: PlanEmbedTheme): PlanDesignTheme {
  if (theme === PlanEmbedTheme.DARK) return 'dark';
  if (theme === PlanEmbedTheme.AUTO) return 'light';
  return 'light';
}

function mapEmbedLayout(layout: PlanEmbedLayout): PlanDesignLayout {
  if (layout === PlanEmbedLayout.COMPARISON) return 'comparison';
  return 'cards';
}

export function parsePlanGroupDesignSettings(
  value: unknown,
): PlanGroupDesignSettings {
  if (!isRecord(value)) return {};
  return {
    theme: pickEnum(value.theme, ['light', 'dark', 'custom'] as const),
    layout: pickEnum(value.layout, ['cards', 'compact', 'comparison'] as const),
    columns: pickEnum(value.columns, ['auto', '2', '3', '4'] as const),
    cardWidth: pickEnum(value.cardWidth, [
      'auto',
      'narrow',
      'medium',
      'wide',
      'full',
    ] as const),
    sectionBackgroundColor: sanitizeOptionalHexColor(
      value.sectionBackgroundColor,
    ),
    sectionTextColor: sanitizeOptionalHexColor(value.sectionTextColor),
    sectionMutedTextColor: sanitizeOptionalHexColor(
      value.sectionMutedTextColor,
    ),
    accentColor: sanitizeOptionalHexColor(value.accentColor),
    fontFamily: pickString(value.fontFamily),
    headingFontSize: pickString(value.headingFontSize),
    bodyFontSize: pickString(value.bodyFontSize),
    cardBackgroundColor: sanitizeOptionalHexColor(value.cardBackgroundColor),
    cardTextColor: sanitizeOptionalHexColor(value.cardTextColor),
    cardBorderColor: sanitizeOptionalHexColor(value.cardBorderColor),
    cardBorderRadius: pickString(value.cardBorderRadius),
    cardShadow: pickEnum(value.cardShadow, ['none', 'sm', 'md', 'lg'] as const),
    buttonStyle: pickEnum(value.buttonStyle, [
      'solid',
      'outline',
      'soft',
    ] as const),
    buttonBackgroundColor: sanitizeOptionalHexColor(
      value.buttonBackgroundColor,
    ),
    buttonTextColor: sanitizeOptionalHexColor(value.buttonTextColor),
    buttonBorderRadius: pickString(value.buttonBorderRadius),
    featureIconStyle: pickEnum(value.featureIconStyle, [
      'check',
      'dot',
      'plus',
      'none',
    ] as const),
    featureIconColor: sanitizeOptionalHexColor(value.featureIconColor),
    featureIconBackgroundColor: sanitizeOptionalHexColor(
      value.featureIconBackgroundColor,
    ),
    featureIconSize: pickEnum(value.featureIconSize, [
      'sm',
      'md',
      'lg',
    ] as const),
    showMonthlyYearlyToggle:
      typeof value.showMonthlyYearlyToggle === 'boolean'
        ? value.showMonthlyYearlyToggle
        : undefined,
    showPlanGroupTitle:
      typeof value.showPlanGroupTitle === 'boolean'
        ? value.showPlanGroupTitle
        : undefined,
    showPlanGroupDescription:
      typeof value.showPlanGroupDescription === 'boolean'
        ? value.showPlanGroupDescription
        : undefined,
    showSetupFee:
      typeof value.showSetupFee === 'boolean' ? value.showSetupFee : undefined,
    showTrialDays:
      typeof value.showTrialDays === 'boolean'
        ? value.showTrialDays
        : undefined,
    showCapabilities:
      typeof value.showCapabilities === 'boolean'
        ? value.showCapabilities
        : undefined,
    showTierFeatures:
      typeof value.showTierFeatures === 'boolean'
        ? value.showTierFeatures
        : undefined,
    showBadges:
      typeof value.showBadges === 'boolean' ? value.showBadges : undefined,
    showDescriptions:
      typeof value.showDescriptions === 'boolean'
        ? value.showDescriptions
        : undefined,
    showFeatureComparison:
      typeof value.showFeatureComparison === 'boolean'
        ? value.showFeatureComparison
        : undefined,
    tierNameAlignment: pickEnum(value.tierNameAlignment, [
      'left',
      'center',
      'right',
    ] as const),
    priceAlignment: pickEnum(value.priceAlignment, [
      'left',
      'center',
      'right',
    ] as const),
    ctaAlignment: pickEnum(value.ctaAlignment, [
      'left',
      'center',
      'right',
    ] as const),
    descriptionAlignment: pickEnum(value.descriptionAlignment, [
      'left',
      'center',
      'right',
    ] as const),
    tierNameBold:
      typeof value.tierNameBold === 'boolean' ? value.tierNameBold : undefined,
    tierNameItalic:
      typeof value.tierNameItalic === 'boolean'
        ? value.tierNameItalic
        : undefined,
    descriptionBold:
      typeof value.descriptionBold === 'boolean'
        ? value.descriptionBold
        : undefined,
    descriptionItalic:
      typeof value.descriptionItalic === 'boolean'
        ? value.descriptionItalic
        : undefined,
    priceBold:
      typeof value.priceBold === 'boolean' ? value.priceBold : undefined,
    priceItalic:
      typeof value.priceItalic === 'boolean' ? value.priceItalic : undefined,
    featureListBold:
      typeof value.featureListBold === 'boolean'
        ? value.featureListBold
        : undefined,
    featureListGap: parseFeatureListGapEm(value.featureListGap),
    ctaBold:
      typeof value.ctaBold === 'boolean' ? value.ctaBold : undefined,
  };
}

export function parsePlanTierDesignSettings(
  value: unknown,
): PlanTierDesignSettings {
  if (!isRecord(value)) return {};
  return {
    cardBackgroundColor: sanitizeOptionalHexColor(value.cardBackgroundColor),
  };
}

export function sanitizePlanGroupDesignSettings(
  input: PlanGroupDesignSettings,
): PlanGroupDesignSettings {
  const parsed = parsePlanGroupDesignSettings(input);
  const result: PlanGroupDesignSettings = {};
  for (const [key, value] of Object.entries(parsed)) {
    if (value !== undefined) {
      (result as Record<string, unknown>)[key] = value;
    }
  }
  return result;
}

export function sanitizePlanTierDesignSettings(
  input: PlanTierDesignSettings,
): PlanTierDesignSettings {
  const parsed = parsePlanTierDesignSettings(input);
  const result: PlanTierDesignSettings = {};
  for (const [key, value] of Object.entries(parsed)) {
    if (value !== undefined) {
      (result as Record<string, unknown>)[key] = value;
    }
  }
  return result;
}

export function resolvePlanGroupDesignSettings(
  stored: unknown,
  embed?: Pick<
    PlanEmbedSettings,
    | 'theme'
    | 'layout'
    | 'showMonthlyYearlyToggle'
    | 'showFeatureComparison'
    | 'showSetupFee'
    | 'showTrialDays'
    | 'showCapabilities'
    | 'showTierFeatures'
  > | null,
): ResolvedPlanGroupDesignSettings {
  const parsed = parsePlanGroupDesignSettings(stored);
  const embedTheme = embed ? mapEmbedTheme(embed.theme) : 'light';
  const base =
    (parsed.theme ?? embedTheme) === 'dark' ? DARK_DEFAULTS : LIGHT_DEFAULTS;

  const theme = parsed.theme ?? embedTheme;
  const themeBase = theme === 'dark' ? DARK_DEFAULTS : LIGHT_DEFAULTS;

  return {
    theme,
    layout: parsed.layout ?? (embed ? mapEmbedLayout(embed.layout) : 'cards'),
    columns: parsed.columns ?? 'auto',
    cardWidth: parsed.cardWidth ?? 'auto',
    sectionBackgroundColor: 'transparent',
    sectionTextColor: parsed.sectionTextColor ?? themeBase.sectionTextColor,
    sectionMutedTextColor:
      parsed.sectionMutedTextColor ?? themeBase.sectionMutedTextColor,
    accentColor: parsed.accentColor ?? themeBase.accentColor,
    fontFamily: parsed.fontFamily ?? base.fontFamily,
    headingFontSize: parsed.headingFontSize ?? base.headingFontSize,
    bodyFontSize: parsed.bodyFontSize ?? base.bodyFontSize,
    cardBackgroundColor:
      parsed.cardBackgroundColor ?? themeBase.cardBackgroundColor,
    cardTextColor: parsed.cardTextColor ?? themeBase.cardTextColor,
    cardBorderColor: parsed.cardBorderColor ?? themeBase.cardBorderColor,
    cardBorderRadius: parsed.cardBorderRadius ?? base.cardBorderRadius,
    cardShadow: parsed.cardShadow ?? base.cardShadow,
    buttonStyle: parsed.buttonStyle ?? base.buttonStyle,
    buttonBackgroundColor:
      parsed.buttonBackgroundColor ?? themeBase.buttonBackgroundColor,
    buttonTextColor: parsed.buttonTextColor ?? themeBase.buttonTextColor,
    buttonBorderRadius: parsed.buttonBorderRadius ?? base.buttonBorderRadius,
    featureIconStyle: parsed.featureIconStyle ?? base.featureIconStyle,
    featureIconColor: parsed.featureIconColor ?? themeBase.featureIconColor,
    featureIconBackgroundColor:
      parsed.featureIconBackgroundColor ?? themeBase.featureIconBackgroundColor,
    featureIconSize: parsed.featureIconSize ?? base.featureIconSize,
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
      parsed.featureListGap ?? base.featureListGap,
    ctaBold: parsed.ctaBold ?? base.ctaBold,
  };
}

function alignmentToCssTextAlign(
  alignment: PlanTextAlignment,
): 'left' | 'center' | 'right' {
  return alignment;
}

function alignmentToCssFlexJustify(
  alignment: PlanTextAlignment,
): 'flex-start' | 'center' | 'flex-end' {
  if (alignment === 'left') return 'flex-start';
  if (alignment === 'right') return 'flex-end';
  return 'center';
}

function typographyWeightCss(bold: boolean): string {
  return bold ? '700' : '400';
}

function typographyStyleCss(italic: boolean): string {
  return italic ? 'italic' : 'normal';
}

export function resolveTierCardStyles(
  group: ResolvedPlanGroupDesignSettings,
  tierOverrides?: PlanTierDesignSettings | null,
): ResolvedTierCardStyles {
  const accent = group.accentColor;
  const softButtonBg =
    group.theme === 'dark' ? 'rgba(59,130,246,.15)' : '#dbeafe';

  let buttonBackgroundColor = group.buttonBackgroundColor;
  let buttonTextColor = group.buttonTextColor;

  if (group.buttonStyle === 'outline') {
    buttonBackgroundColor = 'transparent';
    buttonTextColor = accent;
  } else if (group.buttonStyle === 'soft') {
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
    badgeTextColor: '#ffffff',
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
    '--plan-section-bg': 'transparent',
    '--plan-section-text': settings.sectionTextColor,
    '--plan-section-muted': settings.sectionMutedTextColor,
    '--plan-accent': settings.accentColor,
    '--plan-font-family': settings.fontFamily,
    '--plan-heading-size': settings.headingFontSize,
    '--plan-body-size': settings.bodyFontSize,
    '--plan-tier-gap': '1.25em',
    '--plan-card-max-width': cardWidthToCss(settings.cardWidth),
    '--plan-card-bg': settings.cardBackgroundColor,
    '--plan-card-text': settings.cardTextColor,
    '--plan-card-border': settings.cardBorderColor,
    '--plan-card-radius': settings.cardBorderRadius,
    '--plan-card-shadow': SHADOW_VALUES[settings.cardShadow],
    '--plan-btn-bg': settings.buttonBackgroundColor,
    '--plan-btn-text': settings.buttonTextColor,
    '--plan-btn-radius': settings.buttonBorderRadius,
    '--plan-feature-icon': settings.featureIconColor,
    '--plan-feature-icon-bg': settings.featureIconBackgroundColor,
    '--plan-feature-icon-size': featureIconSizeToPixels(settings.featureIconSize),
    '--plan-tier-name-align': alignmentToCssTextAlign(
      settings.tierNameAlignment,
    ),
    '--plan-price-align': alignmentToCssTextAlign(settings.priceAlignment),
    '--plan-desc-align': alignmentToCssTextAlign(settings.descriptionAlignment),
    '--plan-cta-justify': alignmentToCssFlexJustify(settings.ctaAlignment),
    '--plan-tier-name-weight': typographyWeightCss(settings.tierNameBold),
    '--plan-tier-name-style': typographyStyleCss(settings.tierNameItalic),
    '--plan-desc-weight': typographyWeightCss(settings.descriptionBold),
    '--plan-desc-style': typographyStyleCss(settings.descriptionItalic),
    '--plan-price-weight': typographyWeightCss(settings.priceBold),
    '--plan-price-style': typographyStyleCss(settings.priceItalic),
    '--plan-feature-list-weight': typographyWeightCss(settings.featureListBold),
    '--plan-feature-list-gap': featureListGapToCss(settings.featureListGap),
    '--plan-cta-weight': typographyWeightCss(settings.ctaBold),
  };
}

export function tierStylesToCssVariables(
  styles: ResolvedTierCardStyles,
): Record<string, string> {
  return {
    '--plan-tier-card-bg': styles.cardBackgroundColor,
  };
}

export function gridColumnsClass(
  columns: PlanDesignColumns,
  tierCount: number,
): string {
  if (columns === '2') return 'grid-cols-1 md:grid-cols-2';
  if (columns === '3') return 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3';
  if (columns === '4') return 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-4';
  if (tierCount <= 1) return 'grid-cols-1 max-w-md mx-auto';
  if (tierCount === 2) return 'grid-cols-1 md:grid-cols-2';
  if (tierCount === 3) return 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3';
  return 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-4';
}

export function embedGridColumns(
  columns: PlanDesignColumns,
  tierCount: number,
): string {
  if (columns === '2') return 'repeat(2, minmax(0, 1fr))';
  if (columns === '3') return 'repeat(3, minmax(0, 1fr))';
  if (columns === '4') return 'repeat(4, minmax(0, 1fr))';
  if (tierCount <= 1) return '1fr';
  if (tierCount === 2) return 'repeat(2, minmax(0, 1fr))';
  if (tierCount === 3) return 'repeat(3, minmax(0, 1fr))';
  return 'repeat(auto-fit, minmax(220px, 1fr))';
}

export function featureIconGlyph(
  style: PlanFeatureIconStyle,
  included: boolean,
): string {
  if (!included || style === 'none') return '';
  if (style === 'dot') return '•';
  if (style === 'plus') return '+';
  return '✓';
}

export function getDefaultPlanGroupDesignSettings(): ResolvedPlanGroupDesignSettings {
  return { ...LIGHT_DEFAULTS };
}
