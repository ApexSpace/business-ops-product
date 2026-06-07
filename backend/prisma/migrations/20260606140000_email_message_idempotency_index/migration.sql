-- Index for idempotent email lookup by business + entity
CREATE INDEX "email_messages_businessId_emailType_entityType_entityId_idx" ON "email_messages"("businessId", "emailType", "entityType", "entityId");
