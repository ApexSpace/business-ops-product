import { formatPlanPrice, planPricePeriodSuffix } from './plan-price.util';

describe('plan-price.util', () => {
  it('formats with currency symbol only', () => {
    expect(formatPlanPrice('199', 'USD')).toBe('$199');
    expect(formatPlanPrice('199', 'USD')).not.toContain('USD');
  });

  it('returns em dash for empty amounts', () => {
    expect(formatPlanPrice(null, 'USD')).toBe('—');
    expect(formatPlanPrice('', 'USD')).toBe('—');
  });

  it('returns billing period suffixes', () => {
    expect(planPricePeriodSuffix('MONTHLY')).toBe('/month');
    expect(planPricePeriodSuffix('YEARLY')).toBe('/year');
  });
});
