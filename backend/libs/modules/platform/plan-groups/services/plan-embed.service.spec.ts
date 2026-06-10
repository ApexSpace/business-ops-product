import { PlanEmbedLayout, PlanEmbedTheme } from '@prisma/client';
import { PlanEmbedService } from './plan-embed.service';
import type { PublicPricingDto } from '../dto';

function createService(): PlanEmbedService {
  return new PlanEmbedService({} as never, {} as never, {} as never);
}

function minimalPricingDto(): PublicPricingDto {
  return {
    id: 'cba3e419-b593-4da9-bfb1-66d5cb43dbef',
    name: 'Test <Plan> & "Pro"',
    description: 'A plan with "quotes" & ampersands',
    currency: 'USD',
    billingCycles: ['MONTHLY', 'YEARLY'],
    embed: {
      theme: PlanEmbedTheme.LIGHT,
      layout: PlanEmbedLayout.CARDS,
      showMonthlyYearlyToggle: true,
      showFeatureComparison: false,
      showSetupFee: false,
      showTrialDays: false,
      showCapabilities: false,
      showTierFeatures: true,
    },
    designSettings: {
      theme: 'light',
      layout: 'cards',
      columns: 'auto',
      cardWidth: 'auto',
      sectionBackgroundColor: 'transparent',
      sectionTextColor: '#0f172a',
      sectionMutedTextColor: '#64748b',
      accentColor: '#2563eb',
      fontFamily: 'system-ui, sans-serif',
      headingFontSize: '2rem',
      bodyFontSize: '1rem',
      cardBackgroundColor: '#ffffff',
      cardTextColor: '#0f172a',
      cardBorderColor: '#e2e8f0',
      cardBorderRadius: '12px',
      cardShadow: 'md',
      buttonStyle: 'solid',
      buttonBackgroundColor: '#2563eb',
      buttonTextColor: '#ffffff',
      buttonBorderRadius: '6px',
      featureIconStyle: 'check',
      featureIconColor: '#ffffff',
      featureIconBackgroundColor: '#2563eb',
      featureIconSize: 'sm',
      showMonthlyYearlyToggle: true,
      showPlanGroupTitle: true,
      showPlanGroupDescription: true,
      showSetupFee: false,
      showTrialDays: false,
      showCapabilities: false,
      showTierFeatures: true,
      showBadges: true,
      showDescriptions: true,
      showFeatureComparison: false,
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
      featureListGap: 0.5,
      ctaBold: true,
    },
    rawDesignSettings: null,
    tiers: [
      {
        slug: 'starter',
        name: 'Starter',
        description: 'Basic tier',
        priceMonthly: '29',
        priceYearly: '290',
        setupFee: null,
        trialDays: null,
        badge: null,
        highlighted: false,
        ctaLabel: 'Get started',
        ctaUrl: '#',
        designSettings: {},
        capabilities: [],
        features: [
          {
            label: 'Feature with </script> edge case',
            description: null,
            included: true,
            icon: null,
          },
        ],
      },
    ],
    featureRows: [],
  };
}

describe('PlanEmbedService', () => {
  const service = createService();

  it('renders embed HTML with parseable JSON (not HTML entities)', () => {
    const html = service.renderEmbedHtml(minimalPricingDto());
    expect(html).toContain('<script type="application/json" id="pricing-data">');
    expect(html).toContain(
      'JSON.parse(document.getElementById("pricing-data").textContent)',
    );

    const match = html.match(
      /<script type="application\/json" id="pricing-data">([\s\S]*?)<\/script>/,
    );
    expect(match).not.toBeNull();
    expect(match![1]).not.toContain('&quot;');
    const parsed = JSON.parse(match![1]) as PublicPricingDto;
    expect(parsed.name).toBe('Test <Plan> & "Pro"');
    expect(parsed.tiers[0].features[0].label).toContain('</script>');
  });

  it('includes postMessage resize hook for parent iframe auto-height', () => {
    const html = service.renderEmbedHtml(minimalPricingDto());
    expect(html).toContain('plan-pricing-widget:resize');
    expect(html).toContain('window.parent.postMessage');
  });

  it('escapes title text for HTML context', () => {
    const html = service.renderEmbedHtml(minimalPricingDto());
    expect(html).toContain(
      '<title>Test &lt;Plan&gt; &amp; &quot;Pro&quot; — Pricing</title>',
    );
  });
});
