-- AlterTable
ALTER TABLE "users" ADD COLUMN "phoneE164" TEXT;
ALTER TABLE "users" ADD COLUMN "phoneVerifiedAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "users_phoneE164_key" ON "users"("phoneE164");

-- AlterTable
ALTER TABLE "businesses" ADD COLUMN "signupProfile" JSONB;

-- CreateTable
CREATE TABLE "trial_signup_sessions" (
    "id" TEXT NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "phoneVerifiedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trial_signup_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "trial_signup_sessions_expiresAt_idx" ON "trial_signup_sessions"("expiresAt");
