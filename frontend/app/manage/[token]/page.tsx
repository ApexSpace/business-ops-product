"use client";

import { PublicAppointmentManagePage } from "@/features/public-appointment-manage/components/public-appointment-manage-page";

export default function ManageAppointmentPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  return <PublicAppointmentManagePage params={params} />;
}
