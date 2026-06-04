"use client";

import { FormDialog } from "@/components/forms/form-dialog";
import { AppointmentFormFields } from "@/features/appointments/components/appointment-form-fields";
import {
  useAppointmentForm,
  type UseAppointmentFormOptions,
} from "@/features/appointments/hooks/use-appointment-form";
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

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? "Edit appointment" : "New appointment"}
      form={form}
      onSubmit={(values) => mutation.mutate(values)}
      isPending={mutation.isPending}
      isDeletePending={isDeletePending}
      submitLabel={isEdit ? "Save" : "Create"}
      onDelete={isEdit ? onDelete : undefined}
      deleteLabel="Delete"
      size="lg"
    >
      <AppointmentFormFields form={form} state={state} />
    </FormDialog>
  );
}
