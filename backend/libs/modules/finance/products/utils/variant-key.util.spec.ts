import { buildVariantKey } from './variant-key.util';

describe('buildVariantKey', () => {
  it('builds sorted slugified option:value pairs', () => {
    expect(
      buildVariantKey([
        { optionName: 'Color', optionSortOrder: 1, value: 'Black' },
        { optionName: 'Size', optionSortOrder: 0, value: 'Small' },
      ]),
    ).toBe('size:small/color:black');
  });

  it('handles single option axis', () => {
    expect(
      buildVariantKey([{ optionName: 'Size', optionSortOrder: 0, value: 'L' }]),
    ).toBe('size:l');
  });
});
