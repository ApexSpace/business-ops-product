-- AlterEnum
ALTER TYPE "BusinessNiche" ADD VALUE 'LEGAL';

-- AlterTable
ALTER TABLE "businesses" ADD COLUMN     "address" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "country" TEXT,
ADD COLUMN     "displayName" TEXT,
ADD COLUMN     "email" TEXT,
ADD COLUMN     "firstName" TEXT,
ADD COLUMN     "lastName" TEXT,
ADD COLUMN     "phoneCountryCode" TEXT,
ADD COLUMN     "phoneNumber" TEXT,
ADD COLUMN     "state" TEXT,
ADD COLUMN     "timezone" TEXT,
ADD COLUMN     "website" TEXT,
ADD COLUMN     "zip" TEXT;
