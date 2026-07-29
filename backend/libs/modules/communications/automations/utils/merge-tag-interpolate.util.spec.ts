import { interpolateMergeTags } from './merge-tag-interpolate.util';

describe('interpolateMergeTags', () => {
  it('replaces merge tags with values', () => {
    const result = interpolateMergeTags(
      'Hi {{contact.first_name}}, welcome to {{business.name}}',
      {
        'contact.first_name': 'Jane',
        'business.name': 'Acme',
      },
    );
    expect(result).toBe('Hi Jane, welcome to Acme');
  });

  it('leaves unknown tags empty', () => {
    expect(interpolateMergeTags('{{missing}}', {})).toBe('');
  });
});
