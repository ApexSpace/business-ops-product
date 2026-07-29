-- Soft-delete for conversation messages (staff/client deletes; lists hide deletedAt rows).
ALTER TABLE "conversation_messages" ADD COLUMN "deletedAt" TIMESTAMP(3);

CREATE INDEX "conversation_messages_conversationId_deletedAt_idx"
  ON "conversation_messages"("conversationId", "deletedAt");
