import { mapMetaTemplateStatus } from './template-status.util';
import { getTemplatePolicy } from './template-policy.util';
import {
  assertValidTemplateName,
  buildMetaCreatePayload,
  extractBodyPreview,
  normalizeTemplateName,
} from './template-builder.util';

describe('template-status.util', () => {
  it('maps Meta template statuses', () => {
    expect(mapMetaTemplateStatus('APPROVED')).toBe('APPROVED');
    expect(mapMetaTemplateStatus('rejected')).toBe('REJECTED');
    expect(mapMetaTemplateStatus(undefined)).toBe('PENDING');
  });
});

describe('template-policy.util', () => {
  it('allows send only for approved templates', () => {
    expect(getTemplatePolicy('APPROVED').canSend).toBe(true);
    expect(getTemplatePolicy('PENDING').canSend).toBe(false);
  });

  it('allows edit for rejected and paused templates', () => {
    expect(getTemplatePolicy('REJECTED').canEdit).toBe(true);
    expect(getTemplatePolicy('PAUSED').canEdit).toBe(true);
    expect(getTemplatePolicy('APPROVED').canEdit).toBe(false);
  });
});

describe('template-builder.util', () => {
  it('normalizes template names', () => {
    expect(normalizeTemplateName(' Hello World ')).toBe('hello_world');
  });

  it('builds Meta create payload with body preview', () => {
    const payload = buildMetaCreatePayload({
      name: 'order_update',
      language: 'en_US',
      category: 'UTILITY',
      components: [{ type: 'BODY', text: 'Your order {{1}} is ready.' }],
    });

    expect(payload.name).toBe('order_update');
    expect(
      extractBodyPreview(payload.components as Record<string, unknown>[]),
    ).toBe('Your order {{1}} is ready.');
  });

  it('rejects invalid template names', () => {
    expect(() => assertValidTemplateName('1bad')).toThrow();
  });
});
