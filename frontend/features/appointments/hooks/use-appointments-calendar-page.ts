"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import { useListSearchParams } from "@/lib/hooks/use-list-search-params";
import type { Appointment } from "@/features/appointments/schemas/appointment-profile";
import { isCheckoutOpen } from "@/features/appointments/schemas/appointment-profile";
import type { CalendarViewMode } from "@/features/calendars/utils/calendar-dates";
import { queryKeys } from "@/lib/query/keys";
import {
  getVisibleUtcRange,
  navigateDateKeyInTimezone,
  parseDateKeyInTimezone,
  resolveAppointmentDisplayTimezone,
  todayDateKeyInTimezone,
  toIsoRangeBound,
  wallTimeInTimezoneToUtcIso,
} from "@/features/calendars/utils/timezone";
import {
  deleteAppointment,
  getAppointment,
  listAppointments,
  updateAppointmentStatus,
} from "@/features/appointments/api/appointments.api";
import { listCalendars } from "@/features/calendars/api/calendars.api";
import { getCurrentBusiness, listBusinessMembers } from "@/features/settings/api/business.api";
import {
  addCheckoutService,
  createCheckout,
} from "@/features/sales/api/checkouts.api";
import type { StaffMemberOption } from "@/features/appointments/components/calendar/staff-selector";
import { useAppointmentDrawer } from "@/features/appointments/hooks/use-appointment-drawer";
import { useAppointmentsWorkingHours } from "@/features/appointments/hooks/use-appointments-working-hours";
import { useAuth } from "@/lib/auth/provider";
import { useCalendarStaffPermissions } from "@/features/appointments/hooks/use-calendar-staff-permissions";
import { useSchedulingSettings } from "@/features/scheduling-settings/hooks/use-scheduling-settings";
import { useWaitingRoomSettings } from "@/features/waiting-room-settings/hooks/use-waiting-room-settings";
import { resolveAppointmentBufferMinutes } from "@/features/appointments/utils/resolve-appointment-buffer";

export const APPOINTMENTS_CALENDAR_PARAMS = {
  view: { default: "week" },
  date: { default: "" },
  calendarId: { default: "" },
  assignedToId: { default: "" },
  staffIds: { default: "" },
  status: { default: "" },
  search: { default: "" },
  page: { default: "1" },
  appointmentId: { default: "" },
} as const;

const LIST_PAGE_LIMIT = 20;
const CALENDAR_FETCH_LIMIT = 100;

function parseView(value: string): CalendarViewMode {
  if (
    value === "day" ||
    value === "week" ||
    value === "month" ||
    value === "list"
  ) {
    return value;
  }
  return "week";
}

function isMobileViewport(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(max-width: 767px)").matches
  );
}

function memberLabel(member: {
  user: {
    firstName: string | null;
    lastName: string | null;
    email: string;
  };
}): string {
  const name = [member.user.firstName, member.user.lastName]
    .filter(Boolean)
    .join(" ");
  return name || member.user.email;
}

export function useAppointmentsCalendarPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const calendarPerms = useCalendarStaffPermissions();
  const isMemberOnlyView = calendarPerms.isMemberOnlyView;
  const urlInitDone = useRef(false);
  const appointmentUrlHandled = useRef(false);
  const [isClient, setIsClient] = useState(false);
  const { params, page, setParams } = useListSearchParams(
    APPOINTMENTS_CALENDAR_PARAMS,
  );

  const drawer = useAppointmentDrawer();

  useEffect(() => {
    setIsClient(true);
  }, []);

  const view = parseView(params.view);
  const debouncedSearch = useDebouncedValue(params.search);

  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: business } = useQuery({
    queryKey: queryKeys.business.current(),
    queryFn: () => getCurrentBusiness(),
  });

  const { data: calendars } = useQuery({
    queryKey: queryKeys.calendars.list({ limit: 100 }),
    queryFn: () => listCalendars({ page: 1, limit: 100 }),
  });

  const displayTimezone = useMemo(
    () =>
      resolveAppointmentDisplayTimezone(
        business?.timezone,
        params.calendarId || undefined,
        calendars?.items,
      ),
    [business?.timezone, params.calendarId, calendars?.items],
  );

  const anchorDateKey = params.date || todayDateKeyInTimezone(displayTimezone);

  const { data: members } = useQuery({
    queryKey: queryKeys.business.members({ page: 1, limit: 100 }),
    queryFn: () => listBusinessMembers({ page: 1, limit: 100 }),
  });

  const staffMembers: StaffMemberOption[] = useMemo(() => {
    const all = (members?.items ?? []).map((m) => ({
      userId: m.userId,
      label: memberLabel(m),
      avatarUrl: null,
    }));
    if (isMemberOnlyView && user?.id) {
      return all.filter((m) => m.userId === user.id);
    }
    return all;
  }, [members?.items, isMemberOnlyView, user?.id]);

  const visibleStaffIds = useMemo(() => {
    if (params.staffIds) {
      return params.staffIds.split(",").filter(Boolean);
    }
    return staffMembers.map((m) => m.userId);
  }, [params.staffIds, staffMembers]);

  const visibleStaffMembers = useMemo(
    () =>
      staffMembers.filter((m) => visibleStaffIds.includes(m.userId)),
    [staffMembers, visibleStaffIds],
  );

  const workingHoursStaffIds = useMemo(() => {
    if (view === "week" && params.assignedToId) {
      return [params.assignedToId];
    }
    if (view === "day") {
      return staffMembers.map((m) => m.userId);
    }
    return [];
  }, [view, params.assignedToId, staffMembers]);

  const { businessSlots, staffSlotsByUserId } = useAppointmentsWorkingHours(
    workingHoursStaffIds,
  );

  const { data: schedulingSettings } = useSchedulingSettings();
  const { data: waitingRoomSettings } = useWaitingRoomSettings();
  const rebookingJumpWeeks = schedulingSettings?.rebookingJumpWeeks ?? [
    2, 3, 4, 5, 6, 7,
  ];
  const showBufferOnCalendar = schedulingSettings?.showBufferOnCalendar ?? false;
  const bufferTimeEnabled = schedulingSettings?.bufferTimeEnabled ?? true;
  const waitingStatusEnabled =
    waitingRoomSettings?.waitingStatusEnabled ?? true;

  useEffect(() => {
    if (!isClient || !isMemberOnlyView || !user?.id) return;
    if (params.assignedToId === user.id) return;
    setParams({ assignedToId: user.id });
  }, [isClient, isMemberOnlyView, user?.id, params.assignedToId, setParams]);

  useEffect(() => {
    if (!isClient || urlInitDone.current) return;

    const needsDate = !params.date;
    const needsMobileDayView = params.view === "week" && isMobileViewport();
    const needsStaffDefault =
      view === "week" &&
      isMemberOnlyView &&
      !params.assignedToId &&
      Boolean(user?.id);

    if (!needsDate && !needsMobileDayView && !needsStaffDefault) {
      urlInitDone.current = true;
      return;
    }

    const updates: Partial<
      Record<keyof typeof APPOINTMENTS_CALENDAR_PARAMS, string>
    > = {};
    if (needsDate) {
      updates.date = todayDateKeyInTimezone(displayTimezone);
    }
    if (needsMobileDayView) {
      updates.view = "day";
    }
    if (needsStaffDefault && user?.id) {
      updates.assignedToId = user.id;
    }

    urlInitDone.current = true;
    if (Object.keys(updates).length > 0) {
      setParams(updates);
    }
  }, [
    isClient,
    params.date,
    params.view,
    params.assignedToId,
    displayTimezone,
    setParams,
    view,
    isMemberOnlyView,
    user?.id,
  ]);

  useEffect(() => {
    if (!isClient || appointmentUrlHandled.current) return;
    if (!params.appointmentId) return;
    appointmentUrlHandled.current = true;
    drawer.openDetail(params.appointmentId);
    setParams({ appointmentId: "" });
  }, [isClient, params.appointmentId, drawer, setParams]);

  const appointmentRange = useMemo(() => {
    if (view === "list") return null;
    const range = getVisibleUtcRange(anchorDateKey, view, displayTimezone);
    return {
      startFrom: toIsoRangeBound(range.start),
      startTo: toIsoRangeBound(range.end),
    };
  }, [anchorDateKey, view, displayTimezone]);

  const weekStaffFilter =
    view === "week" ? params.assignedToId || undefined : undefined;

  const calendarQueryFilters = useMemo(
    () => ({
      view,
      startFrom: appointmentRange?.startFrom,
      startTo: appointmentRange?.startTo,
      calendarId: params.calendarId || undefined,
      assignedToId: weekStaffFilter,
      status: params.status || undefined,
      limit: CALENDAR_FETCH_LIMIT,
      page: 1,
    }),
    [
      view,
      appointmentRange?.startFrom,
      appointmentRange?.startTo,
      params.calendarId,
      weekStaffFilter,
      params.status,
    ],
  );

  const listQueryFilters = useMemo(
    () => ({
      page,
      limit: LIST_PAGE_LIMIT,
      search: debouncedSearch || undefined,
      calendarId: params.calendarId || undefined,
      assignedToId: params.assignedToId || undefined,
      status: params.status || undefined,
    }),
    [
      page,
      debouncedSearch,
      params.calendarId,
      params.assignedToId,
      params.status,
    ],
  );

  const { data: calendarData, isLoading: calendarLoading } = useQuery({
    queryKey: queryKeys.appointments.list(calendarQueryFilters),
    queryFn: () =>
      listAppointments({
        page: 1,
        limit: CALENDAR_FETCH_LIMIT,
        startFrom: appointmentRange!.startFrom,
        startTo: appointmentRange!.startTo,
        calendarId: params.calendarId || undefined,
        assignedToId: weekStaffFilter,
        status: params.status || undefined,
      }),
    enabled: view !== "list" && !!appointmentRange,
  });

  const { data: listData, isLoading: listLoading } = useQuery({
    queryKey: queryKeys.appointments.list(listQueryFilters),
    queryFn: () =>
      listAppointments({
        page,
        limit: LIST_PAGE_LIMIT,
        search: debouncedSearch || undefined,
        calendarId: params.calendarId || undefined,
        assignedToId: params.assignedToId || undefined,
        status: params.status || undefined,
      }),
    enabled: view === "list",
  });

  const appointments =
    view === "list" ? (listData?.items ?? []) : (calendarData?.items ?? []);
  const isLoading = view === "list" ? listLoading : calendarLoading;

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteAppointment(id),
    onSuccess: async () => {
      toast.success("Appointment deleted");
      setDeleteId(null);
      drawer.close();
      await queryClient.invalidateQueries({
        queryKey: queryKeys.appointments.all(),
      });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => updateAppointmentStatus(id, "CANCELLED"),
    onSuccess: async () => {
      toast.success("Appointment cancelled");
      await queryClient.invalidateQueries({
        queryKey: queryKeys.appointments.all(),
      });
    },
  });

  const checkoutMutation = useMutation({
    mutationFn: async (appointmentId: string) => {
      const appointment =
        appointments.find((a) => a.id === appointmentId) ??
        (await getAppointment(appointmentId));
      if (!appointment) {
        throw new Error("Appointment not found");
      }

      if (!appointment.contactId) {
        throw new Error("Appointment has no client for checkout");
      }

      if (appointment.relatedCheckoutId) {
        // Open checkout: continue editing. Paid/closed: open view only (no new sale).
        return {
          id: appointment.relatedCheckoutId,
          continued: true as const,
          viewOnly: !isCheckoutOpen(appointment.relatedCheckoutStatus ?? null),
        };
      }

      const checkout = await createCheckout({
        contactId: appointment.contactId,
        appointmentId,
      });
      for (const line of appointment.services ?? []) {
        await addCheckoutService(checkout.id, {
          serviceId: line.serviceId,
          staffUserId: line.assignedToId ?? appointment.assignedToId ?? undefined,
        });
      }
      if (!appointment.services?.length && appointment.serviceId) {
        await addCheckoutService(checkout.id, {
          serviceId: appointment.serviceId,
          staffUserId: appointment.assignedToId ?? undefined,
        });
      }
      return { ...checkout, continued: false as const,
};
    },
    onSuccess: (checkout) => {
      if (!checkout.continued) {
        toast.success("Checkout created");
      }
      drawer.openCheckout(checkout.id);
    },
  });

  const resolveDurationMinutes = useCallback(
    (calendarId?: string) => {
      const cal =
        calendars?.items.find((c) => c.id === calendarId) ??
        calendars?.items.find((c) => c.id === params.calendarId);
      return cal?.defaultDurationMinutes ?? 30;
    },
    [calendars?.items, params.calendarId],
  );

  const openRebook = useCallback(
    (appointment: Appointment) => {
      drawer.openCreate({
        startAt: new Date().toISOString(),
        calendarId: appointment.calendarId ?? undefined,
        assignedToId: appointment.assignedToId ?? undefined,
        contactId: appointment.contactId ?? undefined,
        contactLabel: [
          appointment.contact?.firstName,
          appointment.contact?.lastName,
          appointment.contact?.displayName,
        ]
          .filter(Boolean)
          .join(" ") || undefined,
        services: (appointment.services ?? []).map((line) => {
          const occupancy =
            line.durationMinutes ?? line.service.durationMinutes ?? 60;
          const buffers = resolveAppointmentBufferMinutes(
            {
              ...appointment,
              services: [line],
            },
            bufferTimeEnabled,
          );
          return {
            serviceId: line.serviceId,
            name: line.service.name,
            price: line.price ?? line.service.price,
            assignedToId: line.assignedToId ?? appointment.assignedToId ?? "",
            startMinutes: 0,
            occupancyMinutes: occupancy,
            clientOccupancyMinutes: occupancy,
            staffBlockedMinutes: occupancy,
            bufferBeforeMinutes: buffers.bufferBeforeMinutes,
            bufferAfterMinutes: buffers.bufferAfterMinutes,
          };
        }),
        notes: appointment.notes ?? undefined,
      });
    },
    [drawer, bufferTimeEnabled],
  );

  const openTimeBlockAtSlot = useCallback(
    (
      dateKey: string,
      hour: number,
      minute: number,
      assignedToId?: string,
    ) => {
      const staffId =
        assignedToId ??
        (view === "week" ? params.assignedToId || undefined : undefined);
      if (!calendarPerms.canManageTimeBlockOnStaff(staffId)) {
        toast.error("You do not have permission to manage this time block");
        return;
      }
      const startIso = wallTimeInTimezoneToUtcIso(
        dateKey,
        hour,
        minute,
        displayTimezone,
      );
      drawer.openTimeBlock({
        startAt: startIso,
        assignedToId: staffId,
        calendarId: params.calendarId || calendars?.items[0]?.id,
      });
    },
    [
      displayTimezone,
      params.calendarId,
      params.assignedToId,
      calendars?.items,
      drawer,
      view,
      calendarPerms,
    ],
  );

  const openCreateAtSlot = useCallback(
    (
      dateKey: string,
      hour: number,
      minute: number,
      assignedToId?: string,
    ) => {
      const staffId =
        assignedToId ??
        (view === "week" ? params.assignedToId || undefined : undefined);
      if (!calendarPerms.canManageAppointmentOnStaff(staffId)) {
        toast.error("You do not have permission to book on this calendar");
        return;
      }
      const startIso = wallTimeInTimezoneToUtcIso(
        dateKey,
        hour,
        minute,
        displayTimezone,
      );
      drawer.openCreate({
        startAt: startIso,
        assignedToId: staffId,
        calendarId: params.calendarId || calendars?.items[0]?.id,
      });
    },
    [
      displayTimezone,
      params.calendarId,
      params.assignedToId,
      calendars?.items,
      drawer,
      view,
      calendarPerms,
    ],
  );

  const openAppointmentDetail = useCallback(
    (appointment: Appointment) => {
      drawer.openDetail(appointment.id);
    },
    [drawer],
  );

  const handleViewChange = (next: CalendarViewMode) => {
    setParams({ view: next, page: "1" });
  };

  const navigationView =
    view === "day" ? "day" : view === "month" ? "month" : "week";

  const handleDateNavigate = (direction: -1 | 0 | 1) => {
    const next = navigateDateKeyInTimezone(
      anchorDateKey,
      displayTimezone,
      navigationView,
      direction,
    );
    setParams({ date: next });
  };

  const handleJumpWeeks = (weeks: number) => {
    const next = parseDateKeyInTimezone(anchorDateKey, displayTimezone)
      .plus({ weeks })
      .toFormat("yyyy-MM-dd");
    setParams({ date: next });
  };

  const handleDateSelect = (dateKey: string) => {
    setParams({ date: dateKey });
  };

  const handleDayClick = (dateKey: string) => {
    setParams({ view: "day", date: dateKey });
  };

  const handleVisibleStaffIdsChange = (ids: string[]) => {
    setParams({ staffIds: ids.join(",") });
  };

  const handleSelectedStaffIdChange = (userId: string) => {
    setParams({ assignedToId: userId });
  };

  const invalidateAppointments = () => {
    void queryClient.invalidateQueries({
      queryKey: queryKeys.appointments.all(),
    });
  };

  const showDrawerPanel = drawer.drawerMode === "detail";

  return {
    view,
    params,
    page,
    setParams,
    business,
    calendars,
    members,
    staffMembers,
    visibleStaffMembers,
    visibleStaffIds,
    businessSlots,
    staffSlotsByUserId,
    isMemberOnlyView,
    calendarPerms,
    displayTimezone,
    anchorDateKey,
    appointments,
    isLoading,
    listData,
    drawer,
    showDrawerPanel,
    deleteId,
    setDeleteId,
    deleteMutation,
    cancelMutation,
    checkoutMutation,
    openCreateAtSlot,
    openTimeBlockAtSlot,
    openRebook,
    openAppointmentDetail,
    handleViewChange,
    handleDateNavigate,
    handleJumpWeeks,
    handleDateSelect,
    handleDayClick,
    handleVisibleStaffIdsChange,
    handleSelectedStaffIdChange,
    invalidateAppointments,
    rebookingJumpWeeks,
    showBufferOnCalendar,
    bufferTimeEnabled,
    waitingStatusEnabled,
  };
}
