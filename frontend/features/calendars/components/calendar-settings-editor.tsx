"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import {
  CalendarEditSectionContent,
  CalendarEditSectionNav,
} from "@/features/calendars/components/calendar-edit-sections";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Form, FormSchemaProvider } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CALENDAR_EDIT_SECTIONS,
  calendarFormDefaults,
  calendarFormSchema,
  calendarFormToApiBody,
  calendarToForm,
  DAYS_OF_WEEK,
  defaultWeeklyAvailability,
  getCreationTypeLabel,
  type CalendarDetail,
  type CalendarEditSectionId,
  type CalendarFormValues,
} from "@/features/calendars/schemas/calendar-profile";
import type { IntegrationResourcesListResponse } from "@/features/integrations/utils/integration-resources";
import { queryKeys } from "@/lib/query/keys";
import { getCalendar, updateCalendar, updateCalendarAvailability } from "@/features/calendars/api/calendars.api";
import { listIntegrationResources } from "@/features/integrations/api/integrations.api";
import { PERMISSIONS, useCan } from "@/features/auth/permissions";

interface CalendarSettingsEditorProps {
  calendarId: string;
}

export function CalendarSettingsEditor({ calendarId }: CalendarSettingsEditorProps) {
  const queryClient = useQueryClient();
  const canManage = useCan(PERMISSIONS["settings.business"]);
  const [activeSection, setActiveSection] =
    useState<CalendarEditSectionId>("general");
  const [availability, setAvailability] = useState(
    defaultWeeklyAvailability(),
  );

  const form = useForm<CalendarFormValues>({
    resolver: zodResolver(calendarFormSchema),
    defaultValues: calendarFormDefaults,
  });

  const { data: detail, isLoading } = useQuery({
    queryKey: queryKeys.calendars.detail(calendarId),
    queryFn: () => getCalendar(calendarId),
  });

  const { data: googleResources } = useQuery({
    queryKey: queryKeys.integrations.businessResources("google-calendar"),
    queryFn: () => listIntegrationResources("google-calendar"),
  });

  useEffect(() => {
    if (!detail) return;
    form.reset(calendarToForm(detail));
    setAvailability(
      DAYS_OF_WEEK.map((day) => {
        const slot = detail.availability.find((a) => a.dayOfWeek === day);
        return slot
          ? {
              dayOfWeek: day,
              startTime: slot.startTime,
              endTime: slot.endTime,
              isEnabled: slot.isEnabled,
            }
          : {
              dayOfWeek: day,
              startTime: "09:00",
              endTime: "17:00",
              isEnabled: false,
            };
      }),
    );
  }, [detail, form]);

  const saveMutation = useMutation({
    mutationFn: async (values: CalendarFormValues) => {
      const body = calendarFormToApiBody(values);
      await updateCalendar(calendarId, body);
      await updateCalendarAvailability(calendarId, { slots: availability });
    },
    onSuccess: async () => {
      toast.success("Calendar saved");
      await queryClient.invalidateQueries({ queryKey: queryKeys.calendars.all() });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.calendars.detail(calendarId),
      });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const calendarType = form.watch("type");
  const sectionLabel =
    CALENDAR_EDIT_SECTIONS.find((s) => s.id === activeSection)?.label ?? "";

  if (isLoading) {
    return <Skeleton className="h-[480px] w-full" />;
  }

  if (!detail) {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground">Calendar not found.</p>
        <Button
          nativeButton={false}
          render={<Link href="/business/settings/calendars" />}
        >
          Back to calendars
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={detail.name}
        description={`${getCreationTypeLabel(detail.type)} · Calendar settings`}
        actions={
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href="/business/settings/calendars" />}
          >
            <ArrowLeft className="mr-2 size-4" />
            All calendars
          </Button>
        }
      />

      <Form {...form}>
        <FormSchemaProvider schema={calendarFormSchema}>
          <form
            onSubmit={form.handleSubmit((values) => {
              if (!canManage) return;
              saveMutation.mutate(values);
            })}
            className="flex flex-col gap-6 lg:flex-row lg:items-start"
          >
          <aside className="w-full shrink-0 lg:sticky lg:top-4 lg:w-56">
            <CalendarEditSectionNav
              activeSection={activeSection}
              onSectionChange={setActiveSection}
            />
          </aside>

          <div className="min-w-0 flex-1">
            <div className="rounded-xl border border-border/80 bg-card p-6 shadow-elevation-xs">
              <h2 className="mb-6 text-lg font-semibold">{sectionLabel}</h2>
              <CalendarEditSectionContent
                form={form}
                sectionId={activeSection}
                calendarType={calendarType}
                calendarId={calendarId}
                detail={detail}
                availability={availability}
                onAvailabilityChange={setAvailability}
                googleResources={googleResources}
              />
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <Button
                variant="outline"
                nativeButton={false}
                render={<Link href="/business/settings/calendars" />}
              >
                {canManage ? "Cancel" : "Back to calendars"}
              </Button>
              {canManage ? (
                <Button type="submit" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? "Saving…" : "Save calendar"}
                </Button>
              ) : (
                <p className="self-center text-sm text-muted-foreground">
                  View only — contact an admin to edit this calendar.
                </p>
              )}
            </div>
          </div>
          </form>
        </FormSchemaProvider>
      </Form>
    </div>
  );
}
