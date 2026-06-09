import { config } from 'dotenv';
import { expand } from 'dotenv-expand';
import { resolve } from 'path';
import { resolveDatabaseUrl } from '../libs/core/config/database-url.util';

const loaded = config({ path: resolve(__dirname, '../.env') });
expand(loaded);
process.env.DATABASE_URL = resolveDatabaseUrl(process.env);

/**
 * Dev helper: connect WhatsApp for a business using WHATSAPP_* env vars.
 *
 * Usage:
 *   WHATSAPP_BOOTSTRAP_BUSINESS_ID=<uuid> npm run bootstrap:whatsapp
 *
 * Or omit business id to use the first business in the database.
 */
import { PrismaPg } from '@prisma/adapter-pg';
import {
  IntegrationResourceStatus,
  IntegrationResourceType,
  IntegrationStatus,
  PrismaClient,
} from '@prisma/client';
import { encryptIntegrationCredentials } from '../libs/common/utils/integration-encryption.util';
import { getMetaScopesForProvider } from '../libs/modules/integrations/integrations/meta/constants/meta-provider.config';

const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
const wabaId = process.env.WHATSAPP_WABA_ID?.trim();
const accessToken = process.env.WHATSAPP_ACCESS_TOKEN?.trim();
const encryptionKey = process.env.INTEGRATION_ENCRYPTION_KEY?.trim();
const businessIdFromEnv = process.env.WHATSAPP_BOOTSTRAP_BUSINESS_ID?.trim();

async function main(): Promise<void> {
  if (!phoneNumberId || !accessToken) {
    throw new Error(
      'WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN are required in backend/.env',
    );
  }

  if (!encryptionKey || encryptionKey.length < 32) {
    throw new Error(
      'INTEGRATION_ENCRYPTION_KEY (min 32 chars) is required in backend/.env',
    );
  }

  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) {
    throw new Error(
      'DATABASE_URL is required. Set a PostgreSQL URI in backend/.env, or set DB_HOST, DB_PORT, DB_USERNAME, DB_PASSWORD, and DB_DATABASE.',
    );
  }

  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  try {
    let businessId = businessIdFromEnv;
    let businessName: string | null = null;

    if (businessId) {
      const business = await prisma.business.findUnique({
        where: { id: businessId },
        select: { id: true, name: true },
      });
      if (!business) {
        throw new Error(
          `WHATSAPP_BOOTSTRAP_BUSINESS_ID=${businessId} does not match any business.`,
        );
      }
      businessName = business.name;
    } else {
      const business = await prisma.business.findFirst({
        orderBy: { createdAt: 'asc' },
        select: { id: true, name: true },
      });
      businessId = business?.id;
      businessName = business?.name ?? null;
    }

    if (!businessId) {
      throw new Error(
        'No business found. Create a business first or set WHATSAPP_BOOTSTRAP_BUSINESS_ID.',
      );
    }

    const encrypted = encryptIntegrationCredentials(encryptionKey, {
      accessToken,
      expiresAt: null,
      tokenType: 'bearer',
      metaUserId: wabaId ?? 'dev-bootstrap',
      scopes: getMetaScopesForProvider('whatsapp'),
    });

    const integration = await prisma.businessIntegration.upsert({
      where: {
        businessId_providerKey: { businessId, providerKey: 'whatsapp' },
      },
      create: {
        businessId,
        providerKey: 'whatsapp',
        status: IntegrationStatus.CONNECTED,
        config: {
          provider: 'meta',
          flowType: 'WHATSAPP_EMBEDDED_SIGNUP',
          scopes: getMetaScopesForProvider('whatsapp'),
          metaUserId: wabaId ?? 'dev-bootstrap',
          wabaId: wabaId ?? null,
          phoneNumberId,
          source: 'dev_bootstrap',
        },
        credentials: { encrypted },
        connectedAccountName: 'WhatsApp Business (dev bootstrap)',
        connectedAt: new Date(),
      },
      update: {
        status: IntegrationStatus.CONNECTED,
        config: {
          provider: 'meta',
          flowType: 'WHATSAPP_EMBEDDED_SIGNUP',
          scopes: getMetaScopesForProvider('whatsapp'),
          metaUserId: wabaId ?? 'dev-bootstrap',
          wabaId: wabaId ?? null,
          phoneNumberId,
          source: 'dev_bootstrap',
        },
        credentials: { encrypted },
        connectedAccountName: 'WhatsApp Business (dev bootstrap)',
        connectedAt: new Date(),
        errorMessage: null,
      },
    });

    const resource = await prisma.integrationResource.upsert({
      where: {
        businessIntegrationId_externalId: {
          businessIntegrationId: integration.id,
          externalId: phoneNumberId,
        },
      },
      create: {
        businessIntegrationId: integration.id,
        businessId,
        providerKey: 'whatsapp',
        externalId: phoneNumberId,
        name: phoneNumberId,
        type: IntegrationResourceType.PHONE_NUMBER,
        metadata: {
          wabaId: wabaId ?? null,
          phoneNumberId,
          source: 'dev_bootstrap',
        },
        status: IntegrationResourceStatus.ACTIVE,
        isDefault: true,
        isSelected: true,
        lastSyncedAt: new Date(),
      },
      update: {
        metadata: {
          wabaId: wabaId ?? null,
          phoneNumberId,
          source: 'dev_bootstrap',
        },
        status: IntegrationResourceStatus.ACTIVE,
        isDefault: true,
        isSelected: true,
        lastSyncedAt: new Date(),
      },
    });

    console.log('WhatsApp dev bootstrap complete.');
    console.log(`  businessId: ${businessId}`);
    if (businessName) {
      console.log(`  businessName: ${businessName}`);
    }
    console.log(`  integrationId: ${integration.id}`);
    console.log(`  resourceId: ${resource.id}`);
    console.log(`  phoneNumberId: ${phoneNumberId}`);
    if (wabaId) {
      console.log(`  wabaId: ${wabaId}`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
