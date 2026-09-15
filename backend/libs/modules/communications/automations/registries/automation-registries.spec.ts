import { ACTION_REGISTRY } from './action.registry';
import { AUTOMATION_CATEGORY_BY_KEY } from './category.registry';
import { CONDITION_REGISTRY } from './condition.registry';
import { CUSTOM_VALUE_REGISTRY } from './custom-value.registry';
import { FILTER_OPERATOR_REGISTRY } from './filter-operator.registry';
import {
  ACTION_CONFIG_FIXTURES,
  TRIGGER_PAYLOAD_FIXTURES,
} from './registry.fixtures';
import { TRIGGER_REGISTRY } from './trigger.registry';

function expectUniqueKeys(items: { key: string }[], registryName: string) {
  const keys = items.map((item) => item.key);
  const unique = new Set(keys);
  expect(unique.size).toBe(keys.length);
  if (unique.size !== keys.length) {
    const duplicates = keys.filter((key, index) => keys.indexOf(key) !== index);
    throw new Error(
      `${registryName} has duplicate keys: ${[...new Set(duplicates)].join(', ')}`,
    );
  }
}

describe('automation registries integrity', () => {
  it('has unique keys in every registry', () => {
    expectUniqueKeys(TRIGGER_REGISTRY, 'triggers');
    expectUniqueKeys(ACTION_REGISTRY, 'actions');
    expectUniqueKeys(CUSTOM_VALUE_REGISTRY, 'custom values');
    expectUniqueKeys(CONDITION_REGISTRY, 'conditions');
    expectUniqueKeys(FILTER_OPERATOR_REGISTRY, 'filter operators');
  });

  it('meets expected catalog sizes for phase 1', () => {
    expect(TRIGGER_REGISTRY.length).toBeGreaterThanOrEqual(55);
    expect(ACTION_REGISTRY.length).toBeGreaterThanOrEqual(20);
    expect(CUSTOM_VALUE_REGISTRY.length).toBeGreaterThanOrEqual(80);
    expect(CONDITION_REGISTRY.length).toBeGreaterThanOrEqual(10);
    expect(FILTER_OPERATOR_REGISTRY.length).toBe(8);
  });

  it('assigns every trigger to a known category with trigger scope', () => {
    for (const trigger of TRIGGER_REGISTRY) {
      const category = AUTOMATION_CATEGORY_BY_KEY[trigger.category];
      expect(category).toBeDefined();
      expect(category.scopes).toContain('trigger');
    }
  });

  it('assigns every action to a known category with action scope', () => {
    for (const action of ACTION_REGISTRY) {
      const category = AUTOMATION_CATEGORY_BY_KEY[action.category];
      expect(category).toBeDefined();
      expect(category.scopes).toContain('action');
    }
  });

  it('requires auditAction on every implemented trigger', () => {
    const missing = TRIGGER_REGISTRY.filter(
      (trigger) =>
        trigger.implementationStatus === 'implemented' && !trigger.auditAction,
    );
    expect(missing.map((t) => t.key)).toEqual([]);
  });

  it('validates trigger fixture payloads with Zod schemas', () => {
    for (const [triggerKey, payload] of Object.entries(
      TRIGGER_PAYLOAD_FIXTURES,
    )) {
      const trigger = TRIGGER_REGISTRY.find((t) => t.key === triggerKey);
      expect(trigger).toBeDefined();
      const result = trigger!.payloadSchema.safeParse(payload);
      expect(result.success).toBe(true);
    }
  });

  it('validates action fixture configs with Zod schemas', () => {
    for (const [actionKey, config] of Object.entries(ACTION_CONFIG_FIXTURES)) {
      const action = ACTION_REGISTRY.find((a) => a.key === actionKey);
      expect(action).toBeDefined();
      const result = action!.configSchema.safeParse(config);
      expect(result.success).toBe(true);
    }
  });

  it('covers at least one implemented trigger per major category', () => {
    const majorCategories = [
      'contact',
      'lead',
      'appointment',
      'conversation',
      'invoice',
      'task',
    ];
    for (const category of majorCategories) {
      const hasImplemented = TRIGGER_REGISTRY.some(
        (trigger) =>
          trigger.category === category &&
          trigger.implementationStatus === 'implemented',
      );
      expect(hasImplemented).toBe(true);
    }
  });

  it('exposes GHL-style category groupings for triggers', () => {
    const triggerCategories = [
      ...new Set(TRIGGER_REGISTRY.map((t) => t.category)),
    ];
    expect(triggerCategories).toEqual(
      expect.arrayContaining([
        'contact',
        'lead',
        'appointment',
        'conversation',
        'form',
        'invoice',
        'schedule',
      ]),
    );
  });
});
