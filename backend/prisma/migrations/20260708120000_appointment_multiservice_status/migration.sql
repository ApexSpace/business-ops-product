-- Appointment status expansion + multi-service lines + invoice appointment link

-- Rename SCHEDULED -> UNCONFIRMED and add new statuses
ALTER TYPE "AppointmentStatus" RENAME VALUE 'SCHEDULED' TO 'UNCONFIRMED';
ALTER TYPE "AppointmentStatus" ADD VALUE IF NOT EXISTS 'WAITING';
ALTER TYPE "AppointmentStatus" ADD VALUE IF NOT EXISTS 'IN_SERVICE';

ALTER TABLE "appointments" ALTER COLUMN "status" SET DEFAULT 'UNCONFIRMED';

-- Multi-service lines per appointment
CREATE TABLE "appointment_service_lines" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "assignedToId" TEXT,
    "startAt" TIMESTAMP(3),
    "durationMinutes" INTEGER,
    "price" DECIMAL(12,2),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "appointment_service_lines_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "appointment_service_lines_appointmentId_idx" ON "appointment_service_lines"("appointmentId");
CREATE INDEX "appointment_service_lines_serviceId_idx" ON "appointment_service_lines"("serviceId");

ALTER TABLE "appointment_service_lines" ADD CONSTRAINT "appointment_service_lines_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "appointment_service_lines" ADD CONSTRAINT "appointment_service_lines_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "appointment_service_lines" ADD CONSTRAINT "appointment_service_lines_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Migrate existing single serviceId into service lines
INSERT INTO "appointment_service_lines" ("id", "appointmentId", "serviceId", "assignedToId", "startAt", "durationMinutes", "sortOrder", "createdAt", "updatedAt")
SELECT
    gen_random_uuid()::text,
    a."id",
    a."serviceId",
    a."assignedToId",
    a."startAt",
    GREATEST(1, EXTRACT(EPOCH FROM (a."endAt" - a."startAt"))::int / 60),
    0,
    a."createdAt",
    a."updatedAt"
FROM "appointments" a
WHERE a."serviceId" IS NOT NULL;

-- Link checkouts/invoices to appointments
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "appointmentId" TEXT;
CREATE INDEX IF NOT EXISTS "invoices_businessId_appointmentId_idx" ON "invoices"("businessId", "appointmentId");
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
