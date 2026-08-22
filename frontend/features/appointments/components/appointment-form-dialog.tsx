"use client";

import { Check } from "lucide-react";
import { FormSheet } from "@/components/forms/form-sheet";
import {
  DRAWER_FOOTER_ACTIONS_CLASS,
  DRAWER_FOOTER_BUTTON_CLASS,
} from "@/components/forms/drawer-sheet";
import { ActionButton } from "@/components/ui/action-button";
import { AppointmentFormFields } from "@/features/appointments/components/appointment-form-fields";
import {
  useAppointmentForm,
  type UseAppointmentFormOptions,
} from "@/features/appointments/hooks/use-appointment-form";
import { appointmentFormSchema } from "@/features/appointments/schemas/appointment-profile";
import { cn } from "@/lib/utils";

interface AppointmentFormDialogProps
  extends Omit<UseAppointmentFormOptions, "open"> {
  open: boolean;
  onDelete?: () => void;
  isDeletePending?: boolean;
}

export function AppointmentFormDialog({
  open,
  onOpenChange,
  onDelete,
  isDeletePending,
  ...formOptions
}: AppointmentFormDialogProps) {
  const state = useAppointmentForm({ ...formOptions, open, onOpenChange });
  const { form, mutation, isEdit } = state;
  const isPending = mutation.isPending;

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? "Edit appointment" : "New appointment"}
      description="Schedule or update an appointment for a contact."
      schema={appointmentFormSchema}
      form={form}
      onSubmit={(values) => mutation.mutate(values)}
      isPending={isPending}
      footer={
        <div className="flex w-full flex-wrap items-center justify-end gap-2.5">
          {isEdit && onDelete ? (
            <ActionButton
              type="button"
              variant="destructive"
              onClick={onDelete}
              disabled={isPending || isDeletePending}
              className={cn(DRAWER_FOOTER_BUTTON_CLASS, "mr-auto")}
            >
              {isDeletePending ? "Deleting…" : "Delete"}
            </ActionButton>
          ) : null}
          <div className={DRAWER_FOOTER_ACTIONS_CLASS}>
            <ActionButton
              type="submit"
              disabled={isPending || isDeletePending}
              className={DRAWER_FOOTER_BUTTON_CLASS}
            >
              {!isEdit ? (
                <Check className="size-4" aria-hidden />
              ) : null}
              {isPending
                ? isEdit
                  ? "Saving…"
                  : "Creating…"
                : isEdit
                  ? "Save"
                  : "Create"}
            </ActionButton>
          </div>
        </div>
      }
    >
      <AppointmentFormFields form={form} state={state} />
    </FormSheet>
  );
}
