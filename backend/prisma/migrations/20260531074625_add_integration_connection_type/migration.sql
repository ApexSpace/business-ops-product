-- CreateEnum
CREATE TYPE "IntegrationConnectionType" AS ENUM ('MANUAL', 'OAUTH');

-- AlterTable
ALTER TABLE "integration_providers" ADD COLUMN     "connectionType" "IntegrationConnectionType" NOT NULL DEFAULT 'MANUAL';
