import { TRIGGER_REGISTRY } from '../registries/trigger.registry';

export type AuditActionTriggerMap = Record<string, string[]>;

/** Maps audit action strings to implemented automation trigger keys. */
export function buildAuditActionTriggerMap(): AuditActionTriggerMap {
  const map: AuditActionTriggerMap = {};

  for (const trigger of TRIGGER_REGISTRY) {
    if (
      trigger.implementationStatus !== 'implemented' ||
      !trigger.auditAction
    ) {
      continue;
    }
    const bucket = map[trigger.auditAction] ?? [];
    if (!bucket.includes(trigger.key)) {
      bucket.push(trigger.key);
    }
    map[trigger.auditAction] = bucket;
  }

  return map;
}

export const AUDIT_ACTION_TRIGGER_MAP = buildAuditActionTriggerMap();
