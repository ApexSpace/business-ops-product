"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CalendarCreatedSuccessDialog } from "@/features/calendars/components/calendar-created-success-dialog";
import { CalendarQuickSetupDialog } from "@/features/calendars/components/calendar-quick-setup-dialog";
import { CalendarTypePickerDialog } from "@/features/calendars/components/calendar-type-picker-dialog";
import {
  calendarFormToApiBody,
  defaultWeeklyAvailability,
  quickSetupToFormValues,
  type Calendar,
  type CalendarCreationTypeId,
  type CalendarCreationTypeOption,
  type QuickSetupValues,
} from "@/features/calendars/schemas/calendar-profile";
import { queryKeys } from "@/lib/query/keys";
import {
  createCalendar,
  getCalendar,
  updateCalendarAvailability,
  updateCalendarStaff,
} from "@/features/calendars/api/calendars.api";
import { getCurrentBusiness } from "@/features/settings/api/business.api";

interface CalendarCreationFlowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessTimezone?: string | null;
  canManage?: boolean;
  onSuccess?: () => void;
}

export function CalendarCreationFlow({
  open,
  onOpenChange,
  businessTimezone,
  canManage = true,
  onSuccess,
}: CalendarCreationFlowProps) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: business } = useQuery({
    queryKey: queryKeys.business.current(),
    queryFn: () => getCurrentBusiness(),
    enabled: open && !businessTimezone,
  });

  const resolvedBusinessTimezone =
    businessTimezone ?? business?.timezone ?? undefined;
  const [step, setStep] = useState<"type" | "quick">("type");
  const [selectedTypeId, setSelectedTypeId] =
    useState<CalendarCreationTypeId | null>(null);
  const [selectedType, setSelectedType] =
    useState<CalendarCreationTypeOption | null>(null);
  const [createdCalendar, setCreatedCalendar] = useState<Calendar | null>(null);
  const [successOpen, setSuccessOpen] = useState(false);

  const resetFlow = () => {
    setStep("type");
    setSelectedTypeId(null);
    setSelectedType(null);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      resetFlow();
      setCreatedCalendar(null);
      setSuccessOpen(false);
    }
    onOpenChange(next);
  };

  const createMutation = useMutation({
    mutationFn: async ({
      values,
      navigateToEdit,
    }: {
      values: QuickSetupValues;
      navigateToEdit: boolean;
    }) => {
      if (!selectedType) throw new Error("Select a calendar type first");
      const formValues = quickSetupToFormValues(
        selectedType,
        values,
        resolvedBusinessTimezone,
      );
      const body = calendarFormToApiBody(formValues);
      const created = await createCalendar(body);
      await updateCalendarAvailability(created.id, {
        slots: defaultWeeklyAvailability(),
      });
      if (values.primaryStaffUserId?.trim()) {
        await updateCalendarStaff(created.id, {
          userId: values.primaryStaffUserId.trim(),
          isPrimary: true,
        });
      }
      const full = await getCalendar(created.id);
      return { calendar: full, navigateToEdit };
    },
    onSuccess: async ({ calendar, navigateToEdit }) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.calendars.all() });
      onSuccess?.();
      handleOpenChange(false);
      if (navigateToEdit) {
        toast.success("Calendar created — finish setup below");
        router.push(`/business/settings/calendars/${calendar.id}/edit`);
        return;
      }
      setCreatedCalendar(calendar);
      setSuccessOpen(true);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (!canManage) return null;

  return (
    <>
      <CalendarTypePickerDialog
        open={open && step === "type"}
        onOpenChange={handleOpenChange}
        selectedTypeId={selectedTypeId}
        onSelectType={(type) => {
          setSelectedTypeId(type.id);
          setSelectedType(type);
        }}
        onContinue={() => setStep("quick")}
      />
      <CalendarQuickSetupDialog
        open={open && step === "quick"}
        onOpenChange={handleOpenChange}
        calendarType={selectedType}
        isPending={createMutation.isPending}
        onBack={() => setStep("type")}
        onCreate={(values) =>
          createMutation.mutate({ values, navigateToEdit: false })
        }
        onAdvancedSettings={(values) =>
          createMutation.mutate({ values, navigateToEdit: true })
        }
      />
      <CalendarCreatedSuccessDialog
        open={successOpen}
        onOpenChange={setSuccessOpen}
        calendar={createdCalendar}
        onEnablePublicBooking={async (updated) => {
          setCreatedCalendar(updated);
          await queryClient.invalidateQueries({
            queryKey: queryKeys.calendars.all(),
          });
          return updated;
        }}
        onContinueEditing={(id) => {
          setSuccessOpen(false);
          router.push(`/business/settings/calendars/${id}/edit`);
        }}
        onBackToList={() => {
          setSuccessOpen(false);
          router.push("/business/settings/calendars");
        }}
      />
    </>
  );
}
