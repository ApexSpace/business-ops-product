import { extractInboundEmailBody } from './email-reply-body.util';

describe('email-reply-body.util', () => {
  it('keeps only the new reply from a Gmail single-line quote', () => {
    const raw =
      'fine how about you ? On Wed, 10 Jun 2026 at 15:26, Awais Business <awaisbusiness@notify.codesoltech.com> wrote: > hello world how areyou';

    expect(extractInboundEmailBody(raw)).toBe('fine how about you ?');
  });

  it('keeps only the new reply from a Gmail multi-line quote', () => {
    const raw = `fine how about you ?

On Wed, 10 Jun 2026 at 15:26, Awais Business <awaisbusiness@notify.codesoltech.com> wrote:
> hello world how areyou`;

    expect(extractInboundEmailBody(raw)).toBe('fine how about you ?');
  });

  it('strips Gmail quote without email in attribution line', () => {
    const raw =
      'helllo oooos On Wed, 10 Jun 2026 at 15:55, Mirza Shahbaz wrote:';

    expect(extractInboundEmailBody(raw)).toBe('helllo oooos');
  });

  it('strips the latest Gmail single-line reply format from production', () => {
    const raw =
      'sdafasdfggg asf On Wed, 10 Jun 2026 at 20:23, Mirza Shahbaz wrote:';

    expect(extractInboundEmailBody(raw)).toBe('sdafasdfggg asf');
  });

  it('strips quotes when Gmail inserts a zero-width space before On', () => {
    const raw =
      'sdafasdfggg asf\u200bOn Wed, 10 Jun 2026 at 20:23, Mirza Shahbaz wrote:';

    expect(extractInboundEmailBody(raw)).toBe('sdafasdfggg asf');
  });

  it('strips quotes when html collapses text before On', () => {
    const raw =
      'helllo oooos<div>On Wed, 10 Jun 2026 at 15:55, Mirza Shahbaz wrote:</div>';

    expect(extractInboundEmailBody(raw)).toBe('helllo oooos');
  });

  it('strips quotes when tags are removed without inserting a space', () => {
    const raw =
      'helllo oooosOn Wed, 10 Jun 2026 at 15:55, Mirza Shahbaz wrote:';

    expect(extractInboundEmailBody(raw)).toBe('helllo oooos');
  });

  it('strips quotes when plain text contains html line breaks', () => {
    const raw =
      'what you want<br>On Wed, 10 Jun 2026 at 15:26, Mirza Shahbaz <mirzashahbazbaig724@gmail.com> wrote:';

    expect(extractInboundEmailBody(raw)).toBe('what you want');
  });

  it('strips Outlook original-message blocks', () => {
    const raw = `Sounds good.

-----Original Message-----
From: support@example.com
Sent: Monday`;

    expect(extractInboundEmailBody(raw)).toBe('Sounds good.');
  });

  it('falls back to html and removes blockquotes', () => {
    const html =
      '<p>Thanks!</p><blockquote><p>Old message</p></blockquote>';

    expect(extractInboundEmailBody(null, html)).toBe('Thanks!');
  });

  it('drops orphan wrote attribution lines', () => {
    expect(
      extractInboundEmailBody('awaisbusiness@notify.codesoltech.com> wrote:'),
    ).toBeNull();
  });
});
