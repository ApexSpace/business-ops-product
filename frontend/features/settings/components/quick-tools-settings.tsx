"use client";

import { useState } from "react";
import { SettingsFormPage } from "@/components/layout/settings-page-layout";
import { Button } from "@/components/ui/button";
import {
  SETTINGS_FORM_DESCRIPTION_CLASS,
  SETTINGS_FORM_SECTION_STACK_CLASS,
} from "@/lib/design/settings-form-tokens";
import { PERMISSIONS, useCan } from "@/features/auth/permissions";
import { SetNotWorkingDialog } from "@/features/quick-tools/components/set-not-working-dialog";
import { RemoveNotWorkingDialog } from "@/features/quick-tools/components/remove-not-working-dialog";

function QuickToolSection({
  title,
  description,
  actionLabel,
  onAction,
  disabled,
}: {
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
  disabled?: boolean;
}) {
  return (
    <section className={SETTINGS_FORM_SECTION_STACK_CLASS}>
      <div className="space-y-[var(--spacing-1)]">
        <h3 className="text-base font-medium">{title}</h3>
        <p className={SETTINGS_FORM_DESCRIPTION_CLASS}>{description}</p>
      </div>
      <div>
        <Button type="button" variant="link" className="h-auto p-0" onClick={onAction} disabled={disabled}>
          {actionLabel}
        </Button>
      </div>
    </section>
  );
}

export function QuickToolsSettingsScreen() {
  const canEdit = useCan(PERMISSIONS["settings.business"]);
  const [setDialogOpen, setSetDialogOpen] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);

  return (
    <SettingsFormPage>
      <div className="space-y-8">
        <QuickToolSection
          title='Set Staff to "Not Working"'
          description="Quickly mark selected staff as unavailable for a single day or a date range. They won't appear as bookable online during those days, but existing appointments stay on the calendar."
          actionLabel="Set staff to not working"
          onAction={() => setSetDialogOpen(true)}
          disabled={!canEdit}
        />

        <QuickToolSection
          title='Remove "Not Working" from Staff'
          description='Clear full-day "not working" blocks for selected staff in a date range. Weekly work schedules and partial-day exceptions are not changed.'
          actionLabel='Remove "not working" from staff'
          onAction={() => setRemoveDialogOpen(true)}
          disabled={!canEdit}
        />
      </div>

      <SetNotWorkingDialog open={setDialogOpen} onOpenChange={setSetDialogOpen} />
      <RemoveNotWorkingDialog
        open={removeDialogOpen}
        onOpenChange={setRemoveDialogOpen}
      />
    </SettingsFormPage>
  );
}
