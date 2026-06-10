import { AppException } from '@app/common/exceptions/app.exception';
import { CapabilityValidationService } from './capability-validation.service';

describe('CapabilityValidationService', () => {
  const service = new CapabilityValidationService();

  it('accepts valid dotted keys', () => {
    expect(() => service.validateKey('crm.contacts')).not.toThrow();
    expect(() => service.validateKey('whatsapp_marketing')).not.toThrow();
  });

  it('rejects invalid keys', () => {
    expect(() => service.validateKey('CRM')).toThrow(AppException);
    expect(() => service.validateKey('crm-Contacts')).toThrow(AppException);
    expect(() => service.validateKey('1crm')).toThrow(AppException);
  });

  it('allows unknown routes without strict mode', () => {
    const result = service.validateRoute('/business/unknown');
    expect(result.valid).toBe(true);
    expect(result.warning).toContain('not in the business route registry');
  });

  it('rejects unknown routes in strict mode', () => {
    const result = service.validateRoute('/business/unknown', { strict: true });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('not in the business route registry');
  });

  it('accepts known business routes', () => {
    const result = service.validateRoute('/business/contacts', {
      strict: true,
    });
    expect(result.valid).toBe(true);
  });

  it('validates JSON schema objects', () => {
    expect(() =>
      service.validateJsonSchema({ type: 'object', properties: {} }),
    ).not.toThrow();
    expect(() => service.validateJsonSchema([] as never)).toThrow(AppException);
  });
});
