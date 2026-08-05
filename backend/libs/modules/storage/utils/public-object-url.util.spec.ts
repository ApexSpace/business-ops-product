import { buildPublicObjectUrl } from './public-object-url.util';

describe('buildPublicObjectUrl', () => {
  it('joins base and key without duplicate slashes', () => {
    expect(
      buildPublicObjectUrl(
        'https://files.codesoltech.com/',
        '/businesses/b1/files/a.mp4',
      ),
    ).toBe('https://files.codesoltech.com/businesses/b1/files/a.mp4');
  });

  it('preserves path segments', () => {
    expect(
      buildPublicObjectUrl(
        'https://files.codesoltech.com',
        'businesses/b1/files/vid.mp4',
      ),
    ).toBe('https://files.codesoltech.com/businesses/b1/files/vid.mp4');
  });
});
