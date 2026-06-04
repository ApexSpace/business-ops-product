export interface ProcessMetaWebhookPayload {
  webhookEventId: string;
}

export interface ProcessStripeWebhookPayload {
  webhookEventId: string;
  source: 'platform' | 'connected';
}

export interface SendOutboundMessagePayload {
  messageId: string;
  businessId: string;
  asyncJobId: string;
}

export interface SearchIndexJobPayload {
  businessId: string;
  entityType: string;
  entityId: string;
  operation: 'upsert' | 'delete';
}

export interface CalendarSyncJobPayload {
  businessId: string;
  calendarId: string;
  actorUserId: string;
  asyncJobId: string;
}

export interface AppointmentGoogleSyncJobPayload {
  businessId: string;
  appointmentId: string;
  actorUserId: string;
  asyncJobId: string;
  /** delete = remove event from Google after local delete */
  operation?: 'sync' | 'delete';
  /** Set when enqueueing delete before soft-delete */
  calendarId?: string;
  externalEventId?: string | null;
  externalProvider?: string | null;
}

export interface IntegrationResourceSyncJobPayload {
  businessId: string;
  providerKey: string;
  actorUserId?: string;
  asyncJobId: string;
}

export interface MetaResourceSyncJobPayload {
  businessId: string;
  providerKey: string;
  asyncJobId: string;
}

export interface CleanupWebhookEventsJobPayload {
  retentionDays: number;
}

export interface CleanupAsyncJobsJobPayload {
  retentionDays: number;
}

export interface CleanupOrphanFilesJobPayload {
  pendingOlderThanHours: number;
}
