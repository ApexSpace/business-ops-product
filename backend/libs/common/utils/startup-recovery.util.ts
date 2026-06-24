import { Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';

const TRANSIENT_DB_ERROR_CODES = new Set([
  'ECONNREFUSED',
  'P1001',
  'P1002',
  'P1017',
]);

/** True when Postgres/Prisma is unreachable (e.g. DB not started yet). */
export function isTransientDatabaseError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return TRANSIENT_DB_ERROR_CODES.has(error.code);
  }
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return true;
  }
  return false;
}

/**
 * Best-effort startup hook — logs and skips when the database is unavailable
 * instead of crashing API/worker boot.
 */
export async function runStartupRecovery(
  logger: Logger,
  label: string,
  run: () => Promise<void>,
): Promise<void> {
  try {
    await run();
  } catch (error) {
    if (isTransientDatabaseError(error)) {
      logger.warn(
        `${label}: database unavailable, skipping startup recovery`,
      );
      return;
    }
    throw error;
  }
}
