-- Reopen POS checkouts that were auto-marked PAID by payment sync when
-- balanceDue was $0 with no payments collected (empty/new sales).
-- Intentionally closed $0 sales keep closedAt set and are left alone.
UPDATE "invoices"
SET
  "status" = 'OPEN',
  "paymentStatus" = 'UNPAID',
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "kind" = 'CHECKOUT'
  AND "status" = 'PAID'
  AND "paidAmount" = 0
  AND "closedAt" IS NULL
  AND "deletedAt" IS NULL;
