import {
  normalizeTransactionalDefaultFrom,
  parseEmailFromAddress,
  resolveTransactionalEmailSender,
} from './email-sender.util';

describe('email-sender.util', () => {
  it('normalizes legacy no-reply addresses to notifications', () => {
    expect(
      normalizeTransactionalDefaultFrom(
        'PandaCue <no-reply@notify.codesoltech.com>',
        'notify.codesoltech.com',
      ),
    ).toBe('PandaCue <notifications@notify.codesoltech.com>');
    expect(
      normalizeTransactionalDefaultFrom('no-reply@example.com', 'example.com'),
    ).toBe('notifications@example.com');
  });

  it('builds notifications@ when default from is missing', () => {
    expect(
      normalizeTransactionalDefaultFrom(null, 'notify.codesoltech.com'),
    ).toBe('notifications@notify.codesoltech.com');
  });

  it('prefers step from name over workflow and platform defaults', () => {
    const sender = resolveTransactionalEmailSender({
      fromName: 'Workflow Sender',
      stepFromName: 'Acme Dental',
      defaultFrom:
        'PandaCue <notifications@notify.codesoltech.com>',
    });

    expect(sender).toEqual({
      email: 'notifications@notify.codesoltech.com',
      name: 'Acme Dental',
      usedDefaultSender: false,
      usedStepFromName: true,
    });
  });

  it('parses display name and email pairs', () => {
    expect(
      parseEmailFromAddress(
        'Acme Dental <notifications@notify.codesoltech.com>',
      ),
    ).toEqual({
      name: 'Acme Dental',
      email: 'notifications@notify.codesoltech.com',
    });
  });
});
