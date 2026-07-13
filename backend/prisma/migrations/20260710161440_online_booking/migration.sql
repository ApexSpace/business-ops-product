-- DropForeignKey
ALTER TABLE "appointments" DROP CONSTRAINT "appointments_calendarId_fkey";

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_calendarId_fkey" FOREIGN KEY ("calendarId") REFERENCES "calendars"("id") ON DELETE SET NULL ON UPDATE CASCADE;
