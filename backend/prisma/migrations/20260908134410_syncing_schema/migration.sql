-- RenameIndex
ALTER INDEX "business_appointment_automated_message_settings_businessId_even" RENAME TO "business_appointment_automated_message_settings_businessId__key";

-- RenameIndex
ALTER INDEX "staff_work_exceptions_business_user_date_key" RENAME TO "staff_work_exceptions_businessId_userId_date_key";
