import { EnrollmentFilterService } from './enrollment-filter.service';
import { ConditionEvaluatorService } from './condition-evaluator.service';
import type { AutomationDomainEventPayload } from '../types/domain-event.types';

describe('EnrollmentFilterService', () => {
  const conditionEvaluator = {
    evaluate: jest.fn(),
  };

  const service = new EnrollmentFilterService(conditionEvaluator as never);

  const event: AutomationDomainEventPayload = {
    triggerKey: 'contact.created',
    businessId: '11111111-1111-4111-8111-111111111111',
    subjectId: '22222222-2222-4222-8222-222222222222',
    subjectType: 'contact',
    auditAction: 'contact.created',
    auditEntityType: 'Contact',
    auditEntityId: '22222222-2222-4222-8222-222222222222',
    occurredAt: '2026-06-18T12:00:00.000Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('passes when no filters are configured', async () => {
    await expect(service.evaluate([], event, event.subjectId)).resolves.toBe(
      true,
    );
  });

  it('evaluates implemented condition keys against the contact record', async () => {
    conditionEvaluator.evaluate.mockResolvedValue(true);

    const result = await service.evaluate(
      [{ fieldKey: 'contact.has_email', operator: 'eq', value: true }],
      event,
      event.subjectId,
    );

    expect(result).toBe(true);
    expect(conditionEvaluator.evaluate).toHaveBeenCalledWith(
      expect.objectContaining({
        businessId: event.businessId,
        contactId: event.subjectId,
        subjectType: 'contact',
      }),
      'contact.has_email',
      'eq',
      true,
    );
  });

  it('falls back to trigger metadata for non-condition filter fields', async () => {
    const result = await service.evaluate(
      [{ fieldKey: 'status', operator: 'eq', value: 'completed' }],
      { ...event, metadata: { status: 'completed' } },
      event.subjectId,
    );

    expect(result).toBe(true);
    expect(conditionEvaluator.evaluate).not.toHaveBeenCalled();
  });
});
