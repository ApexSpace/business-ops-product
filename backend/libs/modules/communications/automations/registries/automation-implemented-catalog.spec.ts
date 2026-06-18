import { ACTION_REGISTRY } from '../registries/action.registry';
import { ACTION_CONFIG_FIXTURES } from '../registries/registry.fixtures';
import { TRIGGER_REGISTRY } from '../registries/trigger.registry';
import {
  buildAuditFixtureForTrigger,
  buildDomainEventPayloadForTrigger,
  SCHEDULER_ONLY_TRIGGER_KEYS,
} from '../utils/automation-trigger-audit.fixtures';
import { buildAutomationDomainEventPayload } from '../utils/audit-domain-event.builder';
import { AUDIT_ACTION_TRIGGER_MAP } from '../utils/audit-action-trigger.map';
import {
  assertActivatableWorkflow,
  validateWorkflowSteps,
} from '../utils/workflow-validation.util';

const implementedTriggers = () =>
  TRIGGER_REGISTRY.filter((t) => t.implementationStatus === 'implemented');

const implementedActions = () =>
  ACTION_REGISTRY.filter((a) => a.implementationStatus === 'implemented');

describe('implemented automation catalog', () => {
  describe('triggers', () => {
    it('maps every implemented trigger auditAction into AUDIT_ACTION_TRIGGER_MAP', () => {
      const missing: string[] = [];
      for (const trigger of implementedTriggers()) {
        if (SCHEDULER_ONLY_TRIGGER_KEYS.has(trigger.key)) {
          continue;
        }
        const keys = AUDIT_ACTION_TRIGGER_MAP[trigger.auditAction ?? ''] ?? [];
        if (!keys.includes(trigger.key)) {
          missing.push(trigger.key);
        }
      }
      expect(missing).toEqual([]);
    });

    it('builds domain events from audit logs for audit-driven triggers', () => {
      const failures: string[] = [];
      for (const trigger of implementedTriggers()) {
        if (SCHEDULER_ONLY_TRIGGER_KEYS.has(trigger.key)) {
          continue;
        }
        const audit = buildAuditFixtureForTrigger(trigger);
        if (!audit) {
          failures.push(`${trigger.key}: missing audit fixture`);
          continue;
        }
        const payload = buildAutomationDomainEventPayload(trigger.key, audit);
        if (!payload) {
          failures.push(`${trigger.key}: buildAutomationDomainEventPayload returned null`);
          continue;
        }
        const parsed = trigger.payloadSchema.safeParse({
          businessId: payload.businessId,
          subjectId: payload.subjectId,
          subjectType: payload.subjectType,
          contextEntityId: payload.contextEntityId,
          contextEntityType: payload.contextEntityType,
          metadata: payload.metadata,
        });
        if (!parsed.success) {
          failures.push(
            `${trigger.key}: payload schema failed (${parsed.error.message})`,
          );
        }
      }
      expect(failures).toEqual([]);
    });

    it('validates payload schema for scheduler-only triggers', () => {
      const failures: string[] = [];
      for (const trigger of implementedTriggers()) {
        if (!SCHEDULER_ONLY_TRIGGER_KEYS.has(trigger.key)) {
          continue;
        }
        const payload = buildDomainEventPayloadForTrigger(trigger);
        if (!payload) {
          failures.push(`${trigger.key}: missing domain payload fixture`);
          continue;
        }
        const parsed = trigger.payloadSchema.safeParse(payload);
        if (!parsed.success) {
          failures.push(
            `${trigger.key}: payload schema failed (${parsed.error.message})`,
          );
        }
      }
      expect(failures).toEqual([]);
    });
  });

  describe('actions', () => {
    it('validates config schema for every implemented action', () => {
      const failures: string[] = [];
      for (const action of implementedActions()) {
        const config = ACTION_CONFIG_FIXTURES[action.key] ?? {};
        const parsed = action.configSchema.safeParse(config);
        if (!parsed.success) {
          failures.push(
            `${action.key}: config schema failed (${parsed.error.message})`,
          );
        }
      }
      expect(failures).toEqual([]);
    });

    it('allows activation workflows using every implemented action', () => {
      for (const action of implementedActions()) {
        const config = ACTION_CONFIG_FIXTURES[action.key] ?? {};
        expect(() =>
          assertActivatableWorkflow('contact.created', [
            {
              id: '11111111-1111-4111-8111-111111111111',
              actionKey: action.key,
              config,
            },
            {
              id: '22222222-2222-4222-8222-222222222222',
              actionKey: 'workflow.end',
              config: {},
            },
          ]),
        ).not.toThrow();
      }
    });

    it('validates workflow steps for every implemented action fixture', () => {
      const failures: string[] = [];
      for (const action of implementedActions()) {
        const config = ACTION_CONFIG_FIXTURES[action.key] ?? {};
        try {
          validateWorkflowSteps([
            {
              id: '11111111-1111-4111-8111-111111111111',
              actionKey: action.key,
              config,
            },
          ]);
        } catch (error) {
          failures.push(
            `${action.key}: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }
      expect(failures).toEqual([]);
    });
  });
});
