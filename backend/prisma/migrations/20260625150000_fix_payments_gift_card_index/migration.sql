-- Fix payments gift card index to match schema (composite businessId + giftCardId)
DROP INDEX IF EXISTS "payments_businessId_giftCardId_idx";
CREATE INDEX "payments_businessId_giftCardId_idx" ON "payments"("businessId", "giftCardId");
