-- Allow time blocks without a linked client
ALTER TABLE "appointments" ALTER COLUMN "contactId" DROP NOT NULL;
