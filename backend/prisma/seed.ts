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
const prisma = new PrismaClient({ adapter });

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

  const plans = [
    {
      name: 'Starter',
      slug: 'starter',
      description: 'For small teams getting started',
      priceMonthly: 49,
      priceYearly: 490,
      features: ['Up to 3 users', '1 pipeline', 'Email support'],
    },
    {
      name: 'Pro',
      slug: 'pro',
      description: 'For growing businesses',
      priceMonthly: 99,
      priceYearly: 990,
      features: ['Unlimited users', 'Multiple pipelines', 'Priority support'],
    },
    {
      name: 'Enterprise',
      slug: 'enterprise',
      description: 'For large organizations',
      priceMonthly: 249,
      priceYearly: 2490,
      features: ['Custom integrations', 'Dedicated support', 'SLA'],
    },
  ];

 

  console.log(`Seeded super admin: ${email}`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
