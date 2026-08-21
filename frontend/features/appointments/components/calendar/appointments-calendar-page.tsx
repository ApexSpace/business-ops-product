"use client";

import { Suspense, useState } from "react";
import dynamic from "next/dynamic";
import { AppointmentListView } from "@/features/appointments/components/calendar/appointment-list-view";
import { CalendarToolbar } from "@/features/appointments/components/calendar/calendar-toolbar";
import { MonthCalendarView } from "@/features/appointments/components/calendar/month-calendar-view";
import { StaffDayCalendarView } from "@/features/appointments/components/calendar/staff-day-calendar-view";
import { WeekCalendarView } from "@/features/appointments/components/calendar/week-calendar-view";
import { MobileCalendarHeader } from "@/features/appointments/components/calendar/mobile/mobile-calendar-header";
import { MobileCalendarDateStrip } from "@/features/appointments/components/calendar/mobile/mobile-calendar-date-strip";
import { AppointmentsMobileBottomNav } from "@/features/appointments/components/calendar/mobile/appointments-mobile-bottom-nav";
import { ConfirmDeleteDialog } from "@/components/forms/confirm-delete-dialog";
import { ListPageSkeleton } from "@/components/layout/list-page";
import { useAppointmentsCreateAction } from "@/features/appointments/hooks/use-appointments-create-action";
import { useAppointmentCalendarDrag } from "@/features/appointments/hooks/use-appointment-calendar-drag";
import { useAppointmentsCalendarPage } from "@/features/appointments/hooks/use-appointments-calendar-page";
import { getAppointment } from "@/features/appointments/api/appointments.api";
import { WaitlistPanel } from "@/features/waitlist/components/waitlist-panel";
import { WaitlistToolbarButton } from "@/features/waitlist/components/waitlist-toolbar-button";
import { useIsMobile } from "@/lib/hooks/use-mobile";
import { cn } from "@/lib/utils";

const AppointmentCreateDrawer = dynamic(
  () =>
    import(
      "@/features/appointments/components/drawer/appointment-create-drawer"
    ).then((m) => m.AppointmentCreateDrawer),
  { ssr: false },
);
const AppointmentDetailDrawer = dynamic(
  () =>
    import(
      "@/features/appointments/components/drawer/appointment-detail-drawer"
    ).then((m) => m.AppointmentDetailDrawer),
  { ssr: false },
);
const AppointmentTimeBlockDrawer = dynamic(
  () =>
    import(
      "@/features/appointments/components/drawer/appointment-time-block-drawer"
    ).then((m) => m.AppointmentTimeBlockDrawer),
  { ssr: false },
);
const ContactConversationDrawer = dynamic(
  () =>
    import(
      "@/features/conversations/components/contact-conversation-drawer"
    ).then((m) => m.ContactConversationDrawer),
  { ssr: false },
);

export function AppointmentsCalendarPage() {
  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
      <Suspense fallback={<ListPageSkeleton />}>
        <AppointmentsCalendarPageContent />
      </Suspense>
    </div>
  );
}

const BARE_VIEW_CLASS = "rounded-none shadow-none";

function AppointmentsCalendarPageContent() {
  const cal = useAppointmentsCalendarPage();
  const isMobile = useIsMobile();
  const [waitlistOpen, setWaitlistOpen] = useState(false);
  const drag = useAppointmentCalendarDrag({
    timezone: cal.displayTimezone,
    enabled:
      (cal.view === "day" || cal.view === "week") &&
      (cal.calendarPerms.canManageOwn || cal.calendarPerms.canManageOthers),
  });

  useAppointmentsCreateAction(() => {
    if (!cal.calendarPerms.canCreateAnyAppointment) {
      return;
    }
    const startIso = new Date().toISOString();
    const assignedToId = cal.params.assignedToId || undefined;
    if (!cal.calendarPerms.canManageAppointmentOnStaff(assignedToId)) {
      return;
    }
    cal.drawer.openCreate({
      startAt: startIso,
      calendarId: cal.params.calendarId || cal.calendars?.items[0]?.id,
      assignedToId,
    });
  });

  const openCreateFromHeader = () => {
    if (!cal.calendarPerms.canCreateAnyAppointment) return;
    const startIso = new Date().toISOString();
    const assignedToId = cal.params.assignedToId || undefined;
    if (!cal.calendarPerms.canManageAppointmentOnStaff(assignedToId)) return;
    cal.drawer.openCreate({
      startAt: startIso,
      calendarId: cal.params.calendarId || cal.calendars?.items[0]?.id,
      assignedToId,
    });
  };

  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col bg-white",
        isMobile ? "gap-0 p-0" : "gap-3 px-4 pt-4 sm:gap-4 sm:px-6 sm:pt-4 lg:px-10 lg:pt-5",
      )}
    >
      {isMobile ? (
        <>
          <MobileCalendarHeader
            anchorDateKey={cal.anchorDateKey}
            timezone={cal.displayTimezone}
            view={cal.view}
            onDateSelect={cal.handleDateSelect}
            onToday={() => cal.handleDateNavigate(0)}
            onJumpWeeks={cal.handleJumpWeeks}
            statusFilter={cal.params.status}
            onStatusFilterChange={(status) =>
              cal.setParams({ status, page: "1" })
            }
            onCreate={openCreateFromHeader}
            canCreate={cal.calendarPerms.canCreateAnyAppointment}
          />
          <MobileCalendarDateStrip
            anchorDateKey={cal.anchorDateKey}
            timezone={cal.displayTimezone}
            view={cal.view}
            onDateSelect={cal.handleDateSelect}
            onPrevious={() => cal.handleDateNavigate(-1)}
            onNext={() => cal.handleDateNavigate(1)}
          />
        </>
      ) : (
        <div className="shrink-0 bg-white">
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
            showStaffSelector={!cal.isMemberOnlyView}
            statusFilter={cal.params.status}
            onStatusFilterChange={(status) =>
              cal.setParams({ status, page: "1" })
            }
          />
        </div>
      )}

      <div className="relative min-h-0 flex-1 overflow-hidden bg-white">
        {cal.view === "day" ? (
          <StaffDayCalendarView
            dateKey={cal.anchorDateKey}
            timezone={cal.displayTimezone}
            calendars={cal.calendars?.items}
            businessTimezone={cal.business?.timezone}
            staffMembers={cal.staffMembers}
            appointments={cal.appointments}
            isLoading={cal.isLoading}
            className={cn(BARE_VIEW_CLASS, "absolute inset-0")}
            businessHoursSlots={cal.businessSlots}
            staffSlotsByUserId={cal.staffSlotsByUserId}
            onAppointmentClick={cal.openAppointmentDetail}
            onAppointmentMoveStart={drag.startMove}
            onAppointmentResizeStart={drag.startResize}
            draggingAppointmentId={drag.draggingId}
            onSlotClick={cal.openCreateAtSlot}
            density={isMobile ? "mobile" : "desktop"}
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
            className={cn(BARE_VIEW_CLASS, "absolute inset-0")}
            businessHoursSlots={cal.businessSlots}
            weekStaffHoursSlots={
              cal.params.assignedToId
                ? (cal.staffSlotsByUserId.get(cal.params.assignedToId) ?? null)
                : null
            }
            onAppointmentClick={cal.openAppointmentDetail}
            onAppointmentMoveStart={drag.startMove}
            onAppointmentResizeStart={drag.startResize}
            draggingAppointmentId={drag.draggingId}
            onSlotClick={cal.openCreateAtSlot}
            density={isMobile ? "mobile" : "desktop"}
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
            className={cn(BARE_VIEW_CLASS, "absolute inset-0")}
            onAppointmentClick={cal.openAppointmentDetail}
            onDayClick={cal.handleDayClick}
          />
        ) : null}

        {cal.view === "list" ? (
          <div className="absolute inset-0 overflow-auto p-3 sm:p-4">
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

        {/* Figma: Waitlist floats bottom-right over the calendar grid */}
        <WaitlistToolbarButton
          onClick={() => setWaitlistOpen(true)}
          className={cn(
            "absolute z-20",
            isMobile
              ? "bottom-3 right-3"
              : "bottom-4 right-4 sm:bottom-5 sm:right-5",
          )}
        />
      </div>

      {isMobile ? <AppointmentsMobileBottomNav /> : null}

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
        onSwitchToAppointment={() => {
          if (cal.drawer.createDefaults) {
            cal.drawer.openCreate(cal.drawer.createDefaults);
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
