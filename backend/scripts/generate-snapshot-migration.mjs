import { writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));

// Load compiled seed definitions via tsx dynamic import
const { SNAPSHOT_SEED_DEFINITIONS } = await import(
  '../libs/modules/platform/snapshots/seeds/snapshot-seed-definitions.ts'
);

const lines = [
  '-- CreateEnum',
  "CREATE TYPE \"SnapshotStatus\" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');",
  '',
  '-- CreateTable',
  'CREATE TABLE "snapshots" (',
  '    "id" TEXT NOT NULL,',
  '    "name" TEXT NOT NULL,',
  '    "description" TEXT,',
  '    "status" "SnapshotStatus" NOT NULL DEFAULT \'DRAFT\',',
  '    "assets" JSONB NOT NULL,',
  '    "publishedAt" TIMESTAMP(3),',
  '    "createdByUserId" TEXT,',
  '    "updatedByUserId" TEXT,',
  '    "deletedAt" TIMESTAMP(3),',
  '    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,',
  '    "updatedAt" TIMESTAMP(3) NOT NULL,',
  '    CONSTRAINT "snapshots_pkey" PRIMARY KEY ("id")',
  ');',
  '',
  'CREATE TABLE "snapshot_provisions" (',
  '    "id" TEXT NOT NULL,',
  '    "businessId" TEXT NOT NULL,',
  '    "snapshotId" TEXT NOT NULL,',
  '    "assetType" TEXT NOT NULL,',
  '    "sourceKey" TEXT NOT NULL,',
  '    "entityId" TEXT NOT NULL,',
  '    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,',
  '    CONSTRAINT "snapshot_provisions_pkey" PRIMARY KEY ("id")',
  ');',
  '',
  'CREATE UNIQUE INDEX "snapshot_provisions_businessId_snapshotId_sourceKey_key" ON "snapshot_provisions"("businessId", "snapshotId", "sourceKey");',
  'CREATE INDEX "snapshot_provisions_businessId_idx" ON "snapshot_provisions"("businessId");',
  '',
  'ALTER TABLE "businesses" ADD COLUMN "snapshotId" TEXT,',
  'ADD COLUMN "snapshotAppliedAt" TIMESTAMP(3);',
  '',
  'ALTER TABLE "tags" ADD COLUMN "color" TEXT;',
  '',
  'ALTER TABLE "snapshots" ADD CONSTRAINT "snapshots_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;',
  'ALTER TABLE "snapshots" ADD CONSTRAINT "snapshots_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;',
  'ALTER TABLE "businesses" ADD CONSTRAINT "businesses_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "snapshots"("id") ON DELETE SET NULL ON UPDATE CASCADE;',
  'ALTER TABLE "snapshot_provisions" ADD CONSTRAINT "snapshot_provisions_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;',
  'ALTER TABLE "snapshot_provisions" ADD CONSTRAINT "snapshot_provisions_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "snapshots"("id") ON DELETE CASCADE ON UPDATE CASCADE;',
  '',
  '-- Seed published snapshots',
];

for (const def of SNAPSHOT_SEED_DEFINITIONS) {
  const assets = JSON.stringify(def.assets).replace(/'/g, "''");
  const desc = (def.description ?? '').replace(/'/g, "''");
  const name = def.name.replace(/'/g, "''");
  lines.push(
    'INSERT INTO "snapshots" ("id", "name", "description", "status", "assets", "publishedAt", "updatedAt")',
    'VALUES (',
    `  '${def.id}',`,
    `  '${name}',`,
    `  '${desc}',`,
    "  'PUBLISHED',",
    `  '${assets}'::jsonb,`,
    '  CURRENT_TIMESTAMP,',
    '  CURRENT_TIMESTAMP',
    ');',
    '',
  );
}

lines.push(
  '-- Backfill existing businesses with default snapshot (no reprovision)',
  'UPDATE "businesses" b',
  'SET',
  `  "snapshotId" = '${SNAPSHOT_SEED_DEFINITIONS[0].id}',`,
  '  "snapshotAppliedAt" = CURRENT_TIMESTAMP',
  'WHERE b."snapshotId" IS NULL;',
);

const outPath = join(
  __dirname,
  '../prisma/migrations/20260607120000_snapshot_system/migration.sql',
);
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, lines.join('\n'));
console.log('Wrote', outPath);
