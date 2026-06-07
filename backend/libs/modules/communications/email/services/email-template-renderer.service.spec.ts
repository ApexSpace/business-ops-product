import { EmailTemplateRendererService } from './email-template-renderer.service';

describe('EmailTemplateRendererService', () => {
  const renderer = new EmailTemplateRendererService();

  it('renders variables with HTML escaping in html mode', () => {
    const result = renderer.renderEmailContent({
      emailType: 'membership.invite',
      subject: 'Hello {{invitee.email}}',
      htmlBody: '<p>Join {{business.name}}</p>',
      variables: {
        'invitee.email': 'test@example.com',
        'inviter.name': 'Alex',
        'business.name': '<Acme>',
        invite_link: 'https://example.com',
      },
    });

    expect(result.subject).toBe('Hello test@example.com');
    expect(result.htmlBody).toContain('&lt;Acme&gt;');
  });

  it('rejects unknown template variables', () => {
    expect(() =>
      renderer.renderEmailContent({
        emailType: 'membership.invite',
        subject: 'Hello {{unknown.var}}',
        htmlBody: '<p>Hi</p>',
        variables: {},
      }),
    ).toThrow(/Invalid template variable/);
  });
});
