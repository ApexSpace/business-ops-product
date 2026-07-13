"use client";

import { Suspense, useState } from "react";
import { AppointmentListView } from "@/features/appointments/components/calendar/appointment-list-view";
import { CalendarToolbar } from "@/features/appointments/components/calendar/calendar-toolbar";
import { MonthCalendarView } from "@/features/appointments/components/calendar/month-calendar-view";
import { StaffDayCalendarView } from "@/features/appointments/components/calendar/staff-day-calendar-view";
import { WeekCalendarView } from "@/features/appointments/components/calendar/week-calendar-view";
import { AppointmentCreateDrawer } from "@/features/appointments/components/drawer/appointment-create-drawer";
import { AppointmentDetailDrawer } from "@/features/appointments/components/drawer/appointment-detail-drawer";
import { AppointmentEditDrawer } from "@/features/appointments/components/drawer/appointment-edit-drawer";
import { AppointmentTimeBlockDrawer } from "@/features/appointments/components/drawer/appointment-time-block-drawer";
import { ContactConversationDrawer } from "@/features/conversations/components/contact-conversation-drawer";
import { ConfirmDeleteDialog } from "@/components/forms/confirm-delete-dialog";
import { ListPageSkeleton } from "@/components/layout/list-page";
import { useAppointmentsCreateAction } from "@/features/appointments/hooks/use-appointments-create-action";
import { useAppointmentCalendarDrag } from "@/features/appointments/hooks/use-appointment-calendar-drag";
import { useAppointmentsCalendarPage } from "@/features/appointments/hooks/use-appointments-calendar-page";
import { getAppointment } from "@/features/appointments/api/appointments.api";
import { WaitlistPanel } from "@/features/waitlist/components/waitlist-panel";

export function AppointmentsCalendarPage() {
  return (
    <Suspense fallback={<ListPageSkeleton />}>
      <AppointmentsCalendarPageContent />
    </Suspense>
  );
}

const BARE_VIEW_CLASS = "rounded-none border-0 shadow-none";

function AppointmentsCalendarPageContent() {
  const cal = useAppointmentsCalendarPage();
  const [waitlistOpen, setWaitlistOpen] = useState(false);
  const drag = useAppointmentCalendarDrag({
    timezone: cal.displayTimezone,
    enabled: cal.view === "day" || cal.view === "week",
  });

  useAppointmentsCreateAction(() => {
    const startIso = new Date().toISOString();
    cal.drawer.openCreate({
      startAt: startIso,
      calendarId: cal.params.calendarId || cal.calendars?.items[0]?.id,
      assignedToId: cal.params.assignedToId || undefined,
    });
  });

  return (
    <div className="flex min-h-[calc(100dvh-8rem)] flex-col">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-elevation-xs">
        <div className="shrink-0 border-b border-border px-2 py-2 sm:px-3 sm:py-3 md:px-4">
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
            showStaffSelector={!cal.isMemberOnlyView}
            statusFilter={cal.params.status}
            onStatusFilterChange={(status) =>
              cal.setParams({ status, page: "1" })
            }
            onOpenWaitlist={() => setWaitlistOpen(true)}
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
              businessHoursSlots={cal.businessSlots}
              staffSlotsByUserId={cal.staffSlotsByUserId}
              onAppointmentClick={cal.openAppointmentDetail}
              onAppointmentMoveStart={drag.startMove}
              onAppointmentResizeStart={drag.startResize}
              draggingAppointmentId={drag.draggingId}
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
              businessHoursSlots={cal.businessSlots}
              weekStaffHoursSlots={
                cal.params.assignedToId
                  ? (cal.staffSlotsByUserId.get(cal.params.assignedToId) ??
                    null)
                  : null
              }
              onAppointmentClick={cal.openAppointmentDetail}
              onAppointmentMoveStart={drag.startMove}
              onAppointmentResizeStart={drag.startResize}
              draggingAppointmentId={drag.draggingId}
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
        timezone={cal.displayTimezone}
        onSuccess={(id) => cal.drawer.openDetail(id)}
        onCreateTimeBlock={() => {
          if (cal.drawer.createDefaults) {
            cal.drawer.openTimeBlock(cal.drawer.createDefaults);
          }
        }}
      />

      <AppointmentTimeBlockDrawer
        open={cal.drawer.drawerMode === "timeBlock"}
        onOpenChange={(open) => {
          if (!open) cal.drawer.close();
        }}
        defaults={cal.drawer.createDefaults}
        defaultCalendarId={cal.params.calendarId || cal.calendars?.items[0]?.id}
        timezone={cal.displayTimezone}
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
        timezone={cal.displayTimezone}
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
          (cal.drawer.drawerMode === "detail" ||
            cal.drawer.drawerMode === "checkout") &&
          Boolean(cal.drawer.appointmentId)
        }
        drawerView={
          cal.drawer.drawerMode === "checkout" ? "checkout" : "detail"
        }
        checkoutId={cal.drawer.checkoutId}
        onOpenChange={(open) => {
          if (!open) cal.drawer.close();
        }}
        appointmentId={cal.drawer.appointmentId}
        onEdit={cal.drawer.openEdit}
        onClose={cal.drawer.close}
        onBackFromCheckout={cal.drawer.closeCheckout}
        onCheckoutComplete={() => {
          cal.drawer.closeCheckout();
        }}
        onMessageClick={cal.drawer.openConversation}
        onCheckout={(id) => cal.checkoutMutation.mutate(id)}
        onOpenCheckoutView={(checkoutId) => cal.drawer.openCheckout(checkoutId)}
        onCancel={(id) => cal.cancelMutation.mutate(id)}
        onDelete={cal.setDeleteId}
        onRebook={async (appointmentId) => {
          const appointment = await getAppointment(appointmentId);
          cal.openRebook(appointment);
          cal.drawer.close();
        }}
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

      <WaitlistPanel
        open={waitlistOpen}
        onOpenChange={setWaitlistOpen}
        anchorDateKey={cal.anchorDateKey}
        timezone={cal.displayTimezone}
        onBooked={(appointmentId) => {
          setWaitlistOpen(false);
          cal.drawer.openDetail(appointmentId);
        }}
      />
    </div>
  );
}
