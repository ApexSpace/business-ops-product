"use client";

import { BusinessHoursSettingsPanel } from "@/features/settings/components/business-hours-settings-panel";
import { PERMISSIONS, useCan } from "@/features/auth/permissions";

export default function BusinessHoursSettingsPage() {
  const canEdit = useCan(PERMISSIONS["settings.business"]);

  return <BusinessHoursSettingsPanel disabled={!canEdit} />;
}
