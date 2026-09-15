-- AlterTable
ALTER TABLE "resources" ADD COLUMN "capacity" INTEGER DEFAULT 1;
ALTER TABLE "resources" ADD COLUMN "alwaysAvailable" BOOLEAN NOT NULL DEFAULT false;
