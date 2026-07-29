import {
  getFeatureKeyRenamePairs,
  moduleKeyFromFeatureKey,
  normalizeFeatureKey,
} from '../utils/feature-key-normalize.util';

describe('feature-key-normalize.util', () => {
  it('normalizes promoted forms keys', () => {
    expect(normalizeFeatureKey('settings.forms.list')).toBe('forms.list');
    expect(normalizeFeatureKey('forms.list')).toBe('forms.list');
  });

  it('normalizes commerce split keys', () => {
    expect(normalizeFeatureKey('payments.estimates.list')).toBe(
      'estimates.list',
    );
    expect(normalizeFeatureKey('payments.invoices.create')).toBe(
      'invoices.create',
    );
    expect(normalizeFeatureKey('payments.transactions.list')).toBe(
      'payments.transactions.list',
    );
  });

  it('normalizes chained legacy keys', () => {
    expect(normalizeFeatureKey('payments.view')).toBe('invoices.list');
    expect(normalizeFeatureKey('forms.builder')).toBe('forms.list');
  });

  it('derives module key from feature key', () => {
    expect(moduleKeyFromFeatureKey('settings.forms.list')).toBe('forms');
    expect(moduleKeyFromFeatureKey('gift_cards.list')).toBe('gift_cards');
  });

  it('lists rename pairs without identity entries', () => {
    const pairs = getFeatureKeyRenamePairs();
    expect(pairs.some((p) => p.from === 'settings.forms.list')).toBe(true);
    expect(pairs.every((p) => p.from !== p.to)).toBe(true);
  });
});
