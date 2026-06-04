"use client";

import { Suspense } from "react";
import { AppointmentFormDialog } from "@/features/appointments/components/appointment-form-dialog";
import { AppointmentListView } from "@/features/appointments/components/calendar/appointment-list-view";
import { CalendarFilters } from "@/features/appointments/components/calendar/calendar-filters";
import { CalendarToolbar } from "@/features/appointments/components/calendar/calendar-toolbar";
import { DayCalendarView } from "@/features/appointments/components/calendar/day-calendar-view";
import { MonthCalendarView } from "@/features/appointments/components/calendar/month-calendar-view";
import { WeekCalendarView } from "@/features/appointments/components/calendar/week-calendar-view";
import { ConfirmDeleteDialog } from "@/components/forms/confirm-delete-dialog";
import { ListPageSkeleton } from "@/components/layout/list-page";
import { PageHeader } from "@/components/layout/page-header";
import { useAppointmentsCalendarPage } from "@/features/appointments/hooks/use-appointments-calendar-page";

export function AppointmentsCalendarPage() {
  return (
    <Suspense fallback={<ListPageSkeleton />}>
      <AppointmentsCalendarPageContent />
    </Suspense>
  );
}

function AppointmentsCalendarPageContent() {
  const cal = useAppointmentsCalendarPage();

  return (
    <div className="space-y-[var(--page-stack-gap)]">
      <PageHeader
        title="Appointments"
        description="Schedule and manage appointments across your business calendars."
      />

      <CalendarToolbar
        view={cal.view}
        onViewChange={cal.handleViewChange}
        anchorDateKey={cal.anchorDateKey}
        timezone={cal.displayTimezone}
        onPrevious={() => cal.handleDateNavigate(-1)}
        onToday={() => cal.handleDateNavigate(0)}
        onNext={() => cal.handleDateNavigate(1)}
        onDateSelect={cal.handleDateSelect}
        onNewAppointment={cal.openNewAppointment}
        filters={
          <CalendarFilters
            showSearch={cal.view === "list"}
            search={cal.params.search}
            onSearchChange={(search) => cal.setParams({ search, page: "1" })}
            calendarId={cal.params.calendarId}
            onCalendarIdChange={(calendarId) =>
              cal.setParams({ calendarId, page: "1" })
            }
            assignedToId={cal.params.assignedToId}
            onAssignedToIdChange={(assignedToId) =>
              cal.setParams({ assignedToId, page: "1" })
            }
            status={cal.params.status}
            onStatusChange={(status) => cal.setParams({ status, page: "1" })}
            calendars={cal.calendars?.items}
            members={cal.members?.items}
          />
        }
      />

      {cal.view === "day" ? (
        <DayCalendarView
          dateKey={cal.anchorDateKey}
          timezone={cal.displayTimezone}
          calendars={cal.calendars?.items}
          businessTimezone={cal.business?.timezone}
          appointments={cal.appointments}
          isLoading={cal.isLoading}
          onAppointmentClick={cal.openEdit}
          onSlotClick={cal.openCreateAtSlot}
        />
      ) : null}

      {cal.view === "week" ? (
        <WeekCalendarView
          anchorDateKey={cal.anchorDateKey}
          timezone={cal.displayTimezone}
          calendars={cal.calendars?.items}
          businessTimezone={cal.business?.timezone}
          appointments={cal.appointments}
          isLoading={cal.isLoading}
          onAppointmentClick={cal.openEdit}
          onSlotClick={cal.openCreateAtSlot}
        />
      ) : null}

      {cal.view === "month" ? (
        <MonthCalendarView
          anchorDateKey={cal.anchorDateKey}
          timezone={cal.displayTimezone}
          calendars={cal.calendars?.items}
          businessTimezone={cal.business?.timezone}
          appointments={cal.appointments}
          isLoading={cal.isLoading}
          onAppointmentClick={cal.openEdit}
          onDayClick={cal.handleDayClick}
        />
      ) : null}

      {cal.view === "list" ? (
        <AppointmentListView
          appointments={cal.appointments}
          timezone={cal.displayTimezone}
          calendars={cal.calendars?.items}
          businessTimezone={cal.business?.timezone}
          isLoading={cal.isLoading}
          page={cal.page}
          meta={cal.listData?.meta}
          onPageChange={(p) => cal.setParams({ page: String(p) })}
          onEdit={cal.openEdit}
          onDelete={cal.setDeleteId}
        />
      ) : null}

      {cal.dialogOpen ? (
        <AppointmentFormDialog
          key={cal.dialogSessionKey}
          sessionKey={cal.dialogSessionKey}
          open
          onOpenChange={(open) => {
            cal.setDialogOpen(open);
            if (!open) {
              cal.setCreateDefaults(null);
              cal.setEditing(null);
            }
          }}
          appointment={cal.editing}
          businessTimezone={cal.business?.timezone}
          defaultStartAt={cal.createDefaults?.startAt}
          defaultEndAt={cal.createDefaults?.endAt}
          defaultCalendarId={cal.createDefaults?.calendarId}
          isDeletePending={cal.deleteMutation.isPending}
          onDelete={
            cal.editing
              ? () => {
                  cal.setDeleteId(cal.editing!.id);
                  cal.setDialogOpen(false);
                  cal.setEditing(null);
                }
              : undefined
          }
          onSuccess={cal.invalidateAppointments}
        />
      ) : null}

      <ConfirmDeleteDialog
        open={!!cal.deleteId}
        onOpenChange={(open) => !open && cal.setDeleteId(null)}
        title="Delete appointment"
        description="This appointment will be removed from your schedule."
        isPending={cal.deleteMutation.isPending}
        onConfirm={() => cal.deleteId && cal.deleteMutation.mutate(cal.deleteId)}
      />
    </div>
  );
}
