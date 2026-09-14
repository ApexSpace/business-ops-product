import { Prisma } from '@prisma/client';

/**
 * Serialize booking for a staff member inside the current transaction.
 *
 * FOR UPDATE on overlapping rows is not enough when the window is empty:
 * two concurrent POSTs both see no rows and both insert (BOOK-06).
 * Transaction-scoped advisory locks close that race.
 */
export async function acquireStaffSlotLocks(
  tx: Prisma.TransactionClient,
  businessId: string,
  staffIds: string[],
): Promise<void> {
  for (const staffId of staffIds) {
    await tx.$executeRaw`
      SELECT pg_advisory_xact_lock(hashtext(${businessId}), hashtext(${staffId}))
    `;
  }
}
