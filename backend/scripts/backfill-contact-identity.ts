import { config } from 'dotenv';
import { expand } from 'dotenv-expand';
import { resolve } from 'path';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { resolveDatabaseUrl } from '../libs/core/config/database-url.util';
import { ContactIdentityBackfillService } from '../libs/modules/communications/conversations/services/contact-identity-backfill.service';

const loaded = config({ path: resolve(__dirname, '../.env') });
expand(loaded);
process.env.DATABASE_URL = resolveDatabaseUrl(process.env);

function parseCliArgs(argv: string[]): {
  businessId?: string;
  dryRun: boolean;
  includePhone: boolean;
} {
  const args = argv.slice(2);
  let businessId = process.env.CONTACT_BACKFILL_BUSINESS_ID?.trim() || undefined;
  let dryRun = process.env.CONTACT_BACKFILL_DRY_RUN !== 'false';
  let includePhone = process.env.CONTACT_BACKFILL_INCLUDE_PHONE !== 'false';

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--apply') {
      dryRun = false;
    } else if (arg === '--dry-run') {
      dryRun = true;
    } else if (arg === '--no-phone') {
      includePhone = false;
    } else if (arg === '--business-id' && args[i + 1]) {
      businessId = args[i + 1];
      i += 1;
    }
  }

  return { businessId, dryRun, includePhone };
}

/**
 * One-shot merge of duplicate contacts for unified inbox identity.
 *
 * Usage:
 *   npm run backfill:contact-identity
 *   npm run backfill:contact-identity:apply
 *   npm run backfill:contact-identity -- --business-id <uuid>
 *   npm run backfill:contact-identity -- --apply --no-phone
 *
 * Env (optional, Unix shells): CONTACT_BACKFILL_BUSINESS_ID, CONTACT_BACKFILL_DRY_RUN=false
 */
async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) {
    throw new Error('DATABASE_URL is required in backend/.env');
  }

  const pool = new Pool({ connectionString });
  const prisma = new PrismaClient({
    adapter: new PrismaPg(pool, { disposeExternalPool: true }),
  });

  const service = new ContactIdentityBackfillService(prisma as never);

  try {
    const options = parseCliArgs(process.argv);
    const result = await service.run(options);

    console.log(JSON.stringify(result, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
