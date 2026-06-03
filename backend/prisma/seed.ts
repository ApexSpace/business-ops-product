import { PrismaPg } from '@prisma/adapter-pg';
import {
  PlatformMemberRole,
  PrismaClient,
  UserStatus,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is required for seeding');
}

const adapter = new PrismaPg({ connectionString });
// Prisma Client typing can get out-of-sync in editors if `prisma generate` hasn't run yet.
// Runtime delegates/enums still work, so keep seed resilient to stale TS types.
const prisma = new PrismaClient({ adapter }) as any;

const integrationProviders = [
  // Communication
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
    sortOrder: 20,
  },
  {
    key: 'email',
    name: 'Email',
    description: 'Transactional and marketing email delivery.',
    category: 'COMMUNICATION',
    isPlatformLevel: true,
    isBusinessLevel: true,
    sortOrder: 30,
  },
  // Calendar
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
  // Reputation
  {
    key: 'google-business-profile',
    name: 'Google Business Profile',
    description: 'Manage reviews and business listings on Google.',
    category: 'REPUTATION',
    isPlatformLevel: false,
    isBusinessLevel: true,
    connectionType: 'OAUTH',
    sortOrder: 50,
  },
  // Payments
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
  // Social Media
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
    description: 'Connect LinkedIn for business identity and future social features.',
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
    sortOrder: 100,
  },
  // Ads
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
    sortOrder: 125,
  },
  // Accounting
  {
    key: 'quickbooks',
    name: 'QuickBooks',
    description: 'Sync invoices and payments with QuickBooks Online.',
    category: 'ACCOUNTING',
    isPlatformLevel: false,
    isBusinessLevel: true,
    sortOrder: 130,
  },
  {
    key: 'xero',
    name: 'Xero',
    description: 'Sync financial data with Xero accounting.',
    category: 'ACCOUNTING',
    isPlatformLevel: false,
    isBusinessLevel: true,
    sortOrder: 140,
  },
  {
    key: 'wave',
    name: 'Wave',
    description: 'Connect Wave for invoicing and bookkeeping.',
    category: 'ACCOUNTING',
    isPlatformLevel: false,
    isBusinessLevel: true,
    sortOrder: 150,
  },
  // AI
  {
    key: 'openai',
    name: 'OpenAI / AI Agent Provider',
    description: 'Platform-wide AI provider for agents and automations.',
    category: 'AI',
    isPlatformLevel: true,
    isBusinessLevel: false,
    sortOrder: 160,
  },
  // Storage
  {
    key: 's3-r2',
    name: 'S3 / Cloudflare R2',
    description: 'Object storage for files, attachments, and media.',
    category: 'STORAGE',
    isPlatformLevel: true,
    isBusinessLevel: false,
    sortOrder: 170,
  },
  // Platform OAuth
  {
    key: 'google-oauth',
    name: 'Google OAuth App',
    description: 'Platform Google OAuth application for calendar and profile integrations.',
    category: 'OTHER',
    isPlatformLevel: true,
    isBusinessLevel: false,
    sortOrder: 180,
  },
  {
    key: 'meta-app',
    name: 'Meta App',
    description:
      'Legacy catalog entry. Meta platform credentials are configured via backend environment variables (META_APP_ID, etc.), not this UI.',
    category: 'OTHER',
    isPlatformLevel: true,
    isBusinessLevel: false,
    isActive: false,
    sortOrder: 190,
  },
];

async function main(): Promise<void> {
  const email =
    process.env.SEED_SUPER_ADMIN_EMAIL ?? 'admin@example.com';
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
      status: UserStatus.ACTIVE,
      platformMembership: {
        create: { role: PlatformMemberRole.SUPER_ADMIN },
      },
    },
    update: {
      passwordHash,
      status: UserStatus.ACTIVE,
    },
  });

  await prisma.platformMembership.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      role: PlatformMemberRole.SUPER_ADMIN,
    },
    update: {
      role: PlatformMemberRole.SUPER_ADMIN,
      deletedAt: null,
    },
  });

  for (const provider of integrationProviders) {
    await prisma.integrationProvider.upsert({
      where: { key: provider.key },
      create: {
        ...provider,
        connectionType:
          provider.connectionType ?? 'MANUAL',
        isActive: provider.isActive ?? true,
      },
      update: {
        name: provider.name,
        description: provider.description,
        category: provider.category,
        isPlatformLevel: provider.isPlatformLevel,
        isBusinessLevel: provider.isBusinessLevel,
        connectionType:
          provider.connectionType ?? 'MANUAL',
        isActive: provider.isActive ?? true,
        sortOrder: provider.sortOrder,
      },
    });
  }

  console.log(`Seeded super admin: ${email}`);
  console.log(`Seeded ${integrationProviders.length} integration providers`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
