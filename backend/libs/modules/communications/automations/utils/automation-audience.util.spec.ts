import {
  applyPlatformAudiencesToActions,
  applyPlatformAudiencesToCustomValues,
  applyPlatformAudiencesToTriggers,
  isAllowedForAudience,
  PLATFORM_ACTION_KEYS,
  PLATFORM_CUSTOM_VALUE_CATEGORIES,
  PLATFORM_TRIGGER_KEYS,
} from './automation-audience.util';
import {
  assertActionsAllowedForAudience,
  assertTriggerAllowedForAudience,
} from './workflow-validation.util';
import { ACTION_REGISTRY } from '../registries/action.registry';
import { CUSTOM_VALUE_REGISTRY } from '../registries/custom-value.registry';
import { TRIGGER_REGISTRY } from '../registries/trigger.registry';
import { AutomationMetadataService } from '../services/automation-metadata.service';

describe('automation audience (platform v1)', () => {
  it('marks only allowlisted triggers/actions/custom values for platform', () => {
    for (const trigger of TRIGGER_REGISTRY) {
      const allowed = isAllowedForAudience(trigger.audiences, 'platform');
      expect(allowed).toBe(PLATFORM_TRIGGER_KEYS.has(trigger.key));
    }
    for (const action of ACTION_REGISTRY) {
      const allowed = isAllowedForAudience(action.audiences, 'platform');
      expect(allowed).toBe(PLATFORM_ACTION_KEYS.has(action.key));
    }
    for (const value of CUSTOM_VALUE_REGISTRY) {
      const allowed = isAllowedForAudience(value.audiences, 'platform');
      expect(allowed).toBe(PLATFORM_CUSTOM_VALUE_CATEGORIES.has(value.category));
    }
  });

  it('filters metadata lists by platform audience', () => {
    const service = new AutomationMetadataService();
    const triggers = service.listTriggers({ audience: 'platform' });
    const actions = service.listActions({ audience: 'platform' });
    const customValues = service.listCustomValues({ audience: 'platform' });

    expect(triggers.map((t) => t.key).sort()).toEqual(
      [
        'chatbot.session.converted',
        'chatbot.session.ended',
        'form.submitted',
      ].sort(),
    );
    expect(actions.map((a) => a.key).sort()).toEqual(
      [...PLATFORM_ACTION_KEYS].sort(),
    );
    expect(
      customValues.every((v) => PLATFORM_CUSTOM_VALUE_CATEGORIES.has(v.category)),
    ).toBe(true);
    expect(customValues.some((v) => v.category === 'contact')).toBe(false);
  });

  it('rejects CRM triggers/actions for platform audience validation', () => {
    expect(() =>
      assertTriggerAllowedForAudience('contact.created', 'platform'),
    ).toThrow(/not available for platform/);
    expect(() =>
      assertActionsAllowedForAudience(
        [{ id: '1', actionKey: 'communication.send_email', config: {} }],
        'platform',
      ),
    ).toThrow(/not available for platform/);
    expect(() =>
      assertTriggerAllowedForAudience('form.submitted', 'platform'),
    ).not.toThrow();
  });

  it('apply helpers are idempotent', () => {
    applyPlatformAudiencesToTriggers(TRIGGER_REGISTRY);
    applyPlatformAudiencesToActions(ACTION_REGISTRY);
    applyPlatformAudiencesToCustomValues(CUSTOM_VALUE_REGISTRY);
    expect(
      TRIGGER_REGISTRY.find((t) => t.key === 'form.submitted')?.audiences,
    ).toEqual(['business', 'platform']);
  });
});
