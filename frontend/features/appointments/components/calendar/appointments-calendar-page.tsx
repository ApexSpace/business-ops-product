"use client";

import { Suspense } from "react";
import { useRouter } from "next/navigation";
import { AppointmentListView } from "@/features/appointments/components/calendar/appointment-list-view";
import { CalendarToolbar } from "@/features/appointments/components/calendar/calendar-toolbar";
import { MonthCalendarView } from "@/features/appointments/components/calendar/month-calendar-view";
import { StaffDayCalendarView } from "@/features/appointments/components/calendar/staff-day-calendar-view";
import { WeekCalendarView } from "@/features/appointments/components/calendar/week-calendar-view";
import { AppointmentCreateDrawer } from "@/features/appointments/components/drawer/appointment-create-drawer";
import { AppointmentDetailDrawer } from "@/features/appointments/components/drawer/appointment-detail-drawer";
import { AppointmentEditDrawer } from "@/features/appointments/components/drawer/appointment-edit-drawer";
import { ContactConversationDrawer } from "@/features/conversations/components/contact-conversation-drawer";
import { ConfirmDeleteDialog } from "@/components/forms/confirm-delete-dialog";
import { ListPageSkeleton } from "@/components/layout/list-page";
import { useAppointmentsCreateAction } from "@/features/appointments/hooks/use-appointments-create-action";
import { useAppointmentsCalendarPage } from "@/features/appointments/hooks/use-appointments-calendar-page";

export function AppointmentsCalendarPage() {
  return (
    <Suspense fallback={<ListPageSkeleton />}>
      <AppointmentsCalendarPageContent />
    </Suspense>
  );
}

const BARE_VIEW_CLASS = "rounded-none border-0 shadow-none";

function AppointmentsCalendarPageContent() {
  const router = useRouter();
  const cal = useAppointmentsCalendarPage();

  useAppointmentsCreateAction(() => {
    const startIso = new Date().toISOString();
    const endIso = new Date(Date.now() + 30 * 60_000).toISOString();
    cal.drawer.openCreate({
      startAt: startIso,
      endAt: endIso,
      calendarId: cal.params.calendarId || cal.calendars?.items[0]?.id,
      assignedToId: cal.params.assignedToId || undefined,
    });
  });

  return (
    <div className="flex min-h-[calc(100dvh-8rem)] flex-col">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-elevation-xs">
        <div className="shrink-0 border-b border-border p-3 sm:p-4">
          <CalendarToolbar
            view={cal.view}
            onViewChange={cal.handleViewChange}
            anchorDateKey={cal.anchorDateKey}
            timezone={cal.displayTimezone}
            onPrevious={() => cal.handleDateNavigate(-1)}
            onToday={() => cal.handleDateNavigate(0)}
            onNext={() => cal.handleDateNavigate(1)}
            onDateSelect={cal.handleDateSelect}
            onJumpWeeks={cal.handleJumpWeeks}
            staffMembers={cal.staffMembers}
            selectedStaffId={cal.params.assignedToId}
            onSelectedStaffIdChange={cal.handleSelectedStaffIdChange}
            visibleStaffIds={cal.visibleStaffIds}
            onVisibleStaffIdsChange={cal.handleVisibleStaffIdsChange}
            statusFilter={cal.params.status}
            onStatusFilterChange={(status) =>
              cal.setParams({ status, page: "1" })
            }
          />
        </div>

        <div className="min-h-0 flex-1 overflow-auto">
          {cal.view === "day" ? (
            <StaffDayCalendarView
              dateKey={cal.anchorDateKey}
              timezone={cal.displayTimezone}
              calendars={cal.calendars?.items}
              businessTimezone={cal.business?.timezone}
              staffMembers={cal.visibleStaffMembers}
              appointments={cal.appointments}
              isLoading={cal.isLoading}
              className={BARE_VIEW_CLASS}
              onAppointmentClick={cal.openAppointmentDetail}
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
              className={BARE_VIEW_CLASS}
              onAppointmentClick={cal.openAppointmentDetail}
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
              className={BARE_VIEW_CLASS}
              onAppointmentClick={cal.openAppointmentDetail}
              onDayClick={cal.handleDayClick}
            />
          ) : null}

          {cal.view === "list" ? (
            <div className="p-3 sm:p-4">
              <AppointmentListView
                appointments={cal.appointments}
                timezone={cal.displayTimezone}
                calendars={cal.calendars?.items}
                businessTimezone={cal.business?.timezone}
                isLoading={cal.isLoading}
                page={cal.page}
                meta={cal.listData?.meta}
                onPageChange={(p) => cal.setParams({ page: String(p) })}
                onEdit={cal.openAppointmentDetail}
                onDelete={cal.setDeleteId}
              />
            </div>
          ) : null}
        </div>
      </div>

      <AppointmentCreateDrawer
        open={cal.drawer.drawerMode === "create"}
        onOpenChange={(open) => {
          if (!open) cal.drawer.close();
        }}
        defaults={cal.drawer.createDefaults}
        defaultCalendarId={cal.params.calendarId || cal.calendars?.items[0]?.id}
        onSuccess={(id) => cal.drawer.openDetail(id)}
      />

      <AppointmentEditDrawer
        open={cal.drawer.drawerMode === "edit"}
        onOpenChange={(open) => {
          if (!open && cal.drawer.appointmentId) {
            cal.drawer.openDetail(cal.drawer.appointmentId);
          } else if (!open) {
            cal.drawer.close();
          }
        }}
        appointmentId={cal.drawer.appointmentId}
        onSuccess={() => {
          if (cal.drawer.appointmentId) {
            cal.drawer.openDetail(cal.drawer.appointmentId);
          }
        }}
      />

      <ContactConversationDrawer
        open={cal.drawer.drawerMode === "conversation"}
        onOpenChange={(open) => {
          if (!open) cal.drawer.closeConversation();
        }}
        contactId={cal.drawer.conversationContactId}
        onClose={cal.drawer.closeConversation}
      />

      <AppointmentDetailDrawer
        variant="sheet"
        open={
          cal.drawer.drawerMode === "detail" && Boolean(cal.drawer.appointmentId)
        }
        onOpenChange={(open) => {
          if (!open) cal.drawer.close();
        }}
        appointmentId={cal.drawer.appointmentId}
        onEdit={cal.drawer.openEdit}
        onClose={cal.drawer.close}
        onMessageClick={cal.drawer.openConversation}
        onCheckout={(id) => cal.checkoutMutation.mutate(id)}
        onViewSale={(checkoutId) =>
          router.push(`/business/sales?sale=${checkoutId}`)
        }
        onCancel={(id) => cal.cancelMutation.mutate(id)}
        onDelete={cal.setDeleteId}
      />

      <ConfirmDeleteDialog
        open={!!cal.deleteId}
        onOpenChange={(open) => !open && cal.setDeleteId(null)}
        title="Delete appointment"
        description="This appointment will be removed from your schedule."
        isPending={cal.deleteMutation.isPending}
        onConfirm={() =>
          cal.deleteId && cal.deleteMutation.mutate(cal.deleteId)
        }
      />
    </div>
  );
}
