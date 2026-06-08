-- DropIndex
DROP INDEX "contacts_email_trgm_idx";

-- DropIndex
DROP INDEX "conversations_preview_trgm_idx";

-- RenameIndex
ALTER INDEX "conversation_participants_conversationId_externalParticipantId_" RENAME TO "conversation_participants_conversationId_externalParticipan_key";
