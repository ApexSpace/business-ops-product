import {
  cardWidthToCss,
  designSettingsToCssVariables,
  featureListGapToCss,
  parsePlanGroupDesignSettings,
  parsePlanTierDesignSettings,
  resolvePlanGroupDesignSettings,
  resolveTierCardStyles,
  sanitizeOptionalHexColor,
  sanitizePlanGroupDesignSettings,
  tierStylesToCssVariables,
} from './plan-design-settings.util';

describe('plan-design-settings.util', () => {
  it('sanitizes valid hex colors', () => {
    expect(sanitizeOptionalHexColor('#fff')).toBe('#fff');
    expect(sanitizeOptionalHexColor('#2563eb')).toBe('#2563eb');
  });

  it('rejects invalid hex colors', () => {
    expect(sanitizeOptionalHexColor('red')).toBeUndefined();
    expect(sanitizeOptionalHexColor('#gggggg')).toBeUndefined();
  });

  it('resolves defaults for empty settings', () => {
    const resolved = resolvePlanGroupDesignSettings(null);
    expect(resolved.theme).toBe('light');
    expect(resolved.showTierFeatures).toBe(true);
    expect(resolved.showPlanGroupTitle).toBe(true);
    expect(resolved.showPlanGroupDescription).toBe(true);
    expect(resolved.accentColor).toBe('#2563eb');
    expect(resolved.tierNameAlignment).toBe('center');
    expect(resolved.priceAlignment).toBe('center');
    expect(resolved.ctaAlignment).toBe('center');
  });

  it('parses plan group title and description visibility toggles', () => {
    const parsed = parsePlanGroupDesignSettings({
      showPlanGroupTitle: false,
      showPlanGroupDescription: false,
    });
    expect(parsed.showPlanGroupTitle).toBe(false);
    expect(parsed.showPlanGroupDescription).toBe(false);

    const resolved = resolvePlanGroupDesignSettings(parsed);
    expect(resolved.showPlanGroupTitle).toBe(false);
    expect(resolved.showPlanGroupDescription).toBe(false);
  });

  it('merges embed fallback toggles', () => {
    const resolved = resolvePlanGroupDesignSettings(null, {
      theme: 'DARK',
      layout: 'COMPARISON',
      showMonthlyYearlyToggle: false,
      showFeatureComparison: false,
      showSetupFee: true,
      showTrialDays: true,
      showCapabilities: false,
      showTierFeatures: false,
    });
    expect(resolved.theme).toBe('dark');
    expect(resolved.layout).toBe('comparison');
    expect(resolved.showMonthlyYearlyToggle).toBe(false);
    expect(resolved.showTierFeatures).toBe(false);
  });

  it('strips invalid colors from stored settings', () => {
    const parsed = parsePlanGroupDesignSettings({
      accentColor: 'not-a-color',
      sectionBackgroundColor: '#ffffff',
    });
    expect(parsed.accentColor).toBeUndefined();
    expect(parsed.sectionBackgroundColor).toBe('#ffffff');
  });

  it('applies tier card background override on top of group styles', () => {
    const group = resolvePlanGroupDesignSettings({
      accentColor: '#2563eb',
      cardBackgroundColor: '#ffffff',
    });
    const tier = resolveTierCardStyles(group, {
      cardBackgroundColor: '#111827',
    });
    expect(tier.cardBackgroundColor).toBe('#111827');
    expect(tier.badgeBackgroundColor).toBe(group.accentColor);
    expect(tier.cardTextColor).toBe(group.cardTextColor);
  });

  it('parses alignment settings', () => {
    const parsed = parsePlanGroupDesignSettings({
      tierNameAlignment: 'left',
      priceAlignment: 'right',
      ctaAlignment: 'center',
    });
    expect(parsed.tierNameAlignment).toBe('left');
    expect(parsed.priceAlignment).toBe('right');
    expect(parsed.ctaAlignment).toBe('center');
  });

  it('exports alignment CSS variables', () => {
    const resolved = resolvePlanGroupDesignSettings({
      tierNameAlignment: 'left',
      priceAlignment: 'right',
      descriptionAlignment: 'left',
      ctaAlignment: 'center',
    });
    const vars = designSettingsToCssVariables(resolved);
    expect(vars['--plan-tier-gap']).toBe('1.25em');
    expect(vars['--plan-tier-name-align']).toBe('left');
    expect(vars['--plan-price-align']).toBe('right');
    expect(vars['--plan-desc-align']).toBe('left');
    expect(vars['--plan-cta-justify']).toBe('center');
  });

  it('exports feature list gap CSS variable', () => {
    const resolved = resolvePlanGroupDesignSettings({ featureListGap: 0.75 });
    const vars = designSettingsToCssVariables(resolved);
    expect(vars['--plan-feature-list-gap']).toBe('0.75em');
    expect(featureListGapToCss(0.5)).toBe('0.5em');
  });

  it('migrates legacy feature list gap values', () => {
    expect(parsePlanGroupDesignSettings({ featureListGap: 'lg' }).featureListGap).toBe(
      0.75,
    );
    expect(parsePlanGroupDesignSettings({ featureListGap: 'sm' }).featureListGap).toBe(
      0.25,
    );
    expect(parsePlanGroupDesignSettings({ featureListGap: 'md' }).featureListGap).toBe(
      0.5,
    );
  });

  it('exports typography CSS variables', () => {
    const resolved = resolvePlanGroupDesignSettings({
      tierNameBold: false,
      tierNameItalic: true,
      descriptionBold: true,
      descriptionItalic: false,
      priceBold: false,
      priceItalic: true,
      featureListBold: true,
      ctaBold: false,
    });
    const vars = designSettingsToCssVariables(resolved);
    expect(vars['--plan-tier-name-weight']).toBe('400');
    expect(vars['--plan-tier-name-style']).toBe('italic');
    expect(vars['--plan-desc-weight']).toBe('700');
    expect(vars['--plan-desc-style']).toBe('normal');
    expect(vars['--plan-price-weight']).toBe('400');
    expect(vars['--plan-price-style']).toBe('italic');
    expect(vars['--plan-feature-list-weight']).toBe('700');
    expect(vars['--plan-cta-weight']).toBe('400');
  });

  it('sanitizes partial design settings for persistence', () => {
    const sanitized = sanitizePlanGroupDesignSettings({
      theme: 'custom',
      accentColor: 'bad',
      showBadges: true,
    });
    expect(sanitized.theme).toBe('custom');
    expect(sanitized.accentColor).toBeUndefined();
    expect(sanitized.showBadges).toBe(true);
  });

  it('parses and resolves card width settings', () => {
    const parsed = parsePlanGroupDesignSettings({ cardWidth: 'medium' });
    expect(parsed.cardWidth).toBe('medium');

    const invalid = parsePlanGroupDesignSettings({ cardWidth: 'extra-wide' });
    expect(invalid.cardWidth).toBeUndefined();

    const resolved = resolvePlanGroupDesignSettings(null);
    expect(resolved.cardWidth).toBe('auto');

    const resolvedMedium = resolvePlanGroupDesignSettings({ cardWidth: 'wide' });
    expect(resolvedMedium.cardWidth).toBe('wide');
  });

  it('exports card width CSS variable', () => {
    expect(cardWidthToCss('narrow')).toBe('280px');
    expect(cardWidthToCss('auto')).toBe('none');
    expect(cardWidthToCss('full')).toBe('100%');

    const vars = designSettingsToCssVariables(
      resolvePlanGroupDesignSettings({ cardWidth: 'medium' }),
    );
    expect(vars['--plan-card-max-width']).toBe('360px');
  });
});
