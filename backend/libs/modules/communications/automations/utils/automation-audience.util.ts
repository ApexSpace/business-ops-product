import type {
  ActionDefinition,
  AutomationAudience,
  CustomValueDefinition,
  TriggerDefinition,
} from '../types/automation-registry.types';
import { DEFAULT_AUTOMATION_AUDIENCES } from '../types/automation-registry.types';

/** Platform v1: form submissions + safe non-CRM actions. */
export const PLATFORM_TRIGGER_KEYS = new Set([
  'form.submitted',
  'chatbot.session.converted',
  'chatbot.session.ended',
]);

export const PLATFORM_ACTION_KEYS = new Set([
  'communication.send_internal_email',
  'workflow.delay',
  'workflow.condition',
  'workflow.end',
  'business.create_from_lead',
]);

export const PLATFORM_CUSTOM_VALUE_CATEGORIES = new Set(['form', 'business']);

export function resolveAudiences(
  audiences?: AutomationAudience[],
): AutomationAudience[] {
  return audiences?.length ? audiences : DEFAULT_AUTOMATION_AUDIENCES;
}

export function isAllowedForAudience(
  audiences: AutomationAudience[] | undefined,
  audience: AutomationAudience,
): boolean {
  return resolveAudiences(audiences).includes(audience);
}

export function applyPlatformAudiencesToTriggers(
  registry: TriggerDefinition[],
): void {
  for (const trigger of registry) {
    if (PLATFORM_TRIGGER_KEYS.has(trigger.key)) {
      trigger.audiences = ['business', 'platform'];
    } else if (!trigger.audiences) {
      trigger.audiences = [...DEFAULT_AUTOMATION_AUDIENCES];
    }
  }
}

export function applyPlatformAudiencesToActions(
  registry: ActionDefinition[],
): void {
  for (const action of registry) {
    if (PLATFORM_ACTION_KEYS.has(action.key)) {
      action.audiences = ['business', 'platform'];
    } else if (!action.audiences) {
      action.audiences = [...DEFAULT_AUTOMATION_AUDIENCES];
    }
  }
}

export function applyPlatformAudiencesToCustomValues(
  registry: CustomValueDefinition[],
): void {
  for (const value of registry) {
    if (PLATFORM_CUSTOM_VALUE_CATEGORIES.has(value.category)) {
      value.audiences = ['business', 'platform'];
    } else if (!value.audiences) {
      value.audiences = [...DEFAULT_AUTOMATION_AUDIENCES];
    }
  }
}
