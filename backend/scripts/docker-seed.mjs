/**
 * Production-safe seed for Docker/Dokploy (no ts-node).
 * Creates super admin + integration providers required for login / bootstrap.
 *
 * Usage: RUN_SEED=true (via docker-entrypoint) or:
 *   node scripts/docker-seed.mjs
 */
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const connectionString = process.env.DATABASE_URL?.trim();
if (!connectionString) {
  console.error('DATABASE_URL is required for seeding');
  process.exit(1);
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const integrationProviders = [
  {
    key: 'whatsapp',
    name: 'WhatsApp',
    description: 'Send and receive WhatsApp messages with customers.',
    category: 'COMMUNICATION',
    isPlatformLevel: true,
    isBusinessLevel: true,
    connectionType: 'EMBEDDED_SIGNUP',
    sortOrder: 10,
  },
  {
    key: 'sms',
    name: 'SMS',
    description: 'Text messaging for notifications and two-way conversations.',
    category: 'COMMUNICATION',
    isPlatformLevel: true,
    isBusinessLevel: true,
    connectionType: 'MANUAL',
    sortOrder: 20,
  },
  {
    key: 'email',
    name: 'Email',
    description: 'Transactional and marketing email delivery.',
    category: 'COMMUNICATION',
    isPlatformLevel: true,
    isBusinessLevel: true,
    connectionType: 'MANUAL',
    sortOrder: 30,
  },
  {
    key: 'google-calendar',
    name: 'Google Calendar',
    description: 'Sync appointments and availability with Google Calendar.',
    category: 'CALENDAR',
    isPlatformLevel: false,
    isBusinessLevel: true,
    connectionType: 'OAUTH',
    sortOrder: 40,
  },
  {
    key: 'google-business-profile',
    name: 'Google Business Profile',
    description: 'Sync Google Business Profile locations for your business.',
    category: 'REPUTATION',
    isPlatformLevel: false,
    isBusinessLevel: true,
    connectionType: 'OAUTH',
    sortOrder: 50,
  },
  {
    key: 'stripe',
    name: 'Stripe',
    description:
      'Connect your Stripe account to accept online payments and invoice checkout.',
    category: 'PAYMENTS',
    isPlatformLevel: false,
    isBusinessLevel: true,
    connectionType: 'OAUTH',
    sortOrder: 60,
  },
  {
    key: 'facebook',
    name: 'Facebook',
    description: 'Connect your Facebook page for messaging and posting.',
    category: 'SOCIAL_MEDIA',
    isPlatformLevel: false,
    isBusinessLevel: true,
    connectionType: 'OAUTH',
    sortOrder: 70,
  },
  {
    key: 'instagram',
    name: 'Instagram',
    description: 'Manage Instagram messaging and content.',
    category: 'SOCIAL_MEDIA',
    isPlatformLevel: false,
    isBusinessLevel: true,
    connectionType: 'OAUTH',
    sortOrder: 80,
  },
  {
    key: 'linkedin',
    name: 'LinkedIn',
    description:
      'Connect LinkedIn for business identity and future social features.',
    category: 'SOCIAL_MEDIA',
    isPlatformLevel: false,
    isBusinessLevel: true,
    connectionType: 'OAUTH',
    isActive: true,
    sortOrder: 90,
  },
  {
    key: 'tiktok-messaging',
    name: 'TikTok',
    description: 'Respond to TikTok direct messages.',
    category: 'SOCIAL_MEDIA',
    isPlatformLevel: false,
    isBusinessLevel: true,
    connectionType: 'MANUAL',
    sortOrder: 100,
  },
  {
    key: 'google-lead-ads',
    name: 'Google Lead Ads',
    description: 'Import leads from Google Ads lead form extensions.',
    category: 'ADS',
    isPlatformLevel: false,
    isBusinessLevel: true,
    connectionType: 'OAUTH',
    sortOrder: 120,
  },
  {
    key: 'tiktok-lead-ads',
    name: 'TikTok Lead Ads',
    description: 'Capture leads from TikTok advertising campaigns.',
    category: 'ADS',
    isPlatformLevel: false,
    isBusinessLevel: true,
    connectionType: 'MANUAL',
    sortOrder: 125,
  },
  {
    key: 'quickbooks',
    name: 'QuickBooks',
    description: 'Sync invoices and payments with QuickBooks Online.',
    category: 'ACCOUNTING',
    isPlatformLevel: false,
    isBusinessLevel: true,
    connectionType: 'MANUAL',
    sortOrder: 130,
  },
  {
    key: 'xero',
    name: 'Xero',
    description: 'Sync financial data with Xero accounting.',
    category: 'ACCOUNTING',
    isPlatformLevel: false,
    isBusinessLevel: true,
    connectionType: 'MANUAL',
    sortOrder: 140,
  },
  {
    key: 'wave',
    name: 'Wave',
    description: 'Connect Wave for invoicing and bookkeeping.',
    category: 'ACCOUNTING',
    isPlatformLevel: false,
    isBusinessLevel: true,
    connectionType: 'MANUAL',
    sortOrder: 150,
  },
  {
    key: 'openai',
    name: 'OpenAI / AI Agent Provider',
    description: 'Platform-wide AI provider for agents and automations.',
    category: 'AI',
    isPlatformLevel: true,
    isBusinessLevel: false,
    connectionType: 'MANUAL',
    sortOrder: 160,
  },
  {
    key: 's3-r2',
    name: 'S3 / Cloudflare R2',
    description: 'Object storage for files, attachments, and media.',
    category: 'STORAGE',
    isPlatformLevel: true,
    isBusinessLevel: false,
    connectionType: 'MANUAL',
    sortOrder: 170,
  },
  {
    key: 'google-oauth',
    name: 'Google OAuth App',
    description:
      'Platform Google OAuth application for calendar and profile integrations.',
    category: 'OTHER',
    isPlatformLevel: true,
    isBusinessLevel: false,
    connectionType: 'MANUAL',
    sortOrder: 180,
  },
  {
    key: 'meta-app',
    name: 'Meta App',
    description:
      'Legacy catalog entry. Meta platform credentials are configured via backend environment variables.',
    category: 'OTHER',
    isPlatformLevel: true,
    isBusinessLevel: false,
    connectionType: 'MANUAL',
    isActive: false,
    sortOrder: 190,
  },
];

async function main() {
  const email = process.env.SEED_SUPER_ADMIN_EMAIL ?? 'admin@example.com';
  const password =
    process.env.SEED_SUPER_ADMIN_PASSWORD ?? 'ChangeMe123!';
  const rounds = parseInt(process.env.BCRYPT_ROUNDS ?? '12', 10);
  const passwordHash = await bcrypt.hash(password, rounds);

  const user = await prisma.user.upsert({
    where: { email },
    create: {
      email,
      passwordHash,
      firstName: 'Super',
      lastName: 'Admin',
      status: 'ACTIVE',
      platformMembership: {
        create: { role: 'SUPER_ADMIN' },
      },
    },
    update: {
      passwordHash,
      status: 'ACTIVE',
    },
  });

  await prisma.platformMembership.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      role: 'SUPER_ADMIN',
    },
    update: {
      role: 'SUPER_ADMIN',
      deletedAt: null,
    },
  });

  for (const provider of integrationProviders) {
    const { isActive, connectionType, ...rest } = provider;
    await prisma.integrationProvider.upsert({
      where: { key: provider.key },
      create: {
        ...rest,
        connectionType: connectionType ?? 'MANUAL',
        isActive: isActive ?? true,
      },
      update: {
        name: provider.name,
        description: provider.description,
        category: provider.category,
        isPlatformLevel: provider.isPlatformLevel,
        isBusinessLevel: provider.isBusinessLevel,
        connectionType: connectionType ?? 'MANUAL',
        isActive: isActive ?? true,
        sortOrder: provider.sortOrder,
      },
    });
  }

  console.log(`Seeded super admin: ${email}`);
  console.log(`Seeded ${integrationProviders.length} integration providers`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
