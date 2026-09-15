/** Sentinel passed to AuditService.log for webhook and background jobs. */
export const SYSTEM_AUDIT_ACTOR_SENTINEL = 'system';

/** Emitted after a business-scoped audit log row is persisted. */
export const AUDIT_LOGGED_EVENT = 'audit.logged';
