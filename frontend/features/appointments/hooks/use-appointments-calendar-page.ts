"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import { useListSearchParams } from "@/lib/hooks/use-list-search-params";
import type { Appointment } from "@/features/appointments/schemas/appointment-profile";
import type { CalendarViewMode } from "@/features/calendars/utils/calendar-dates";
import { queryKeys } from "@/lib/query/keys";
import {
  getVisibleUtcRange,
  navigateDateKeyInTimezone,
  resolveAppointmentDisplayTimezone,
  todayDateKeyInTimezone,
  toIsoRangeBound,
  utcToLocalDateTimeInputValue,
  wallTimeInTimezoneToUtcIso,
} from "@/features/calendars/utils/timezone";
import { deleteAppointment, listAppointments } from "@/features/appointments/api/appointments.api";
import { listCalendars } from "@/features/calendars/api/calendars.api";
import { getCurrentBusiness, listBusinessMembers } from "@/features/settings/api/business.api";

export const APPOINTMENTS_CALENDAR_PARAMS = {
  view: { default: "week" },
  date: { default: "" },
  calendarId: { default: "" },
  assignedToId: { default: "" },
  status: { default: "" },
  search: { default: "" },
  page: { default: "1" },
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

export function useAppointmentsCalendarPage() {
  const queryClient = useQueryClient();
  const urlInitDone = useRef(false);
  const [isClient, setIsClient] = useState(false);
  const { params, page, setParams } = useListSearchParams(
    APPOINTMENTS_CALENDAR_PARAMS,
  );

  useEffect(() => {
    setIsClient(true);
  }, []);

  const view = parseView(params.view);
  const debouncedSearch = useDebouncedValue(params.search);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogSessionKey, setDialogSessionKey] = useState("closed");
  const [editing, setEditing] = useState<Appointment | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [createDefaults, setCreateDefaults] = useState<{
    startAt: string;
    endAt: string;
    calendarId?: string;
  } | null>(null);

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

  useEffect(() => {
    if (!isClient || urlInitDone.current) return;

    const needsDate = !params.date;
    const needsMobileDayView = params.view === "week" && isMobileViewport();

    if (!needsDate && !needsMobileDayView) {
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

    urlInitDone.current = true;
    if (Object.keys(updates).length > 0) {
      setParams(updates);
    }
  }, [isClient, params.date, params.view, displayTimezone, setParams]);

  const { data: members } = useQuery({
    queryKey: queryKeys.business.members({ page: 1, limit: 100 }),
    queryFn: () => listBusinessMembers({ page: 1, limit: 100 }),
  });

  const appointmentRange = useMemo(() => {
    if (view === "list") return null;
    const range = getVisibleUtcRange(anchorDateKey, view, displayTimezone);
    return {
      startFrom: toIsoRangeBound(range.start),
      startTo: toIsoRangeBound(range.end),
    };
  }, [anchorDateKey, view, displayTimezone]);

  const calendarQueryFilters = useMemo(
    () => ({
      view,
      startFrom: appointmentRange?.startFrom,
      startTo: appointmentRange?.startTo,
      calendarId: params.calendarId || undefined,
      assignedToId: params.assignedToId || undefined,
      status: params.status || undefined,
      limit: CALENDAR_FETCH_LIMIT,
      page: 1,
    }),
    [
      view,
      appointmentRange?.startFrom,
      appointmentRange?.startTo,
      params.calendarId,
      params.assignedToId,
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
        assignedToId: params.assignedToId || undefined,
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
      await queryClient.invalidateQueries({
        queryKey: queryKeys.appointments.all(),
      });
    },
    onError: (err: Error) => toast.error(err.message),
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

  const openCreateAtSlot = useCallback(
    (dateKey: string, hour: number, minute: number) => {
      const startIso = wallTimeInTimezoneToUtcIso(
        dateKey,
        hour,
        minute,
        displayTimezone,
      );
      const duration = resolveDurationMinutes(params.calendarId || undefined);
      const endIso = new Date(
        new Date(startIso).getTime() + duration * 60_000,
      ).toISOString();
      setEditing(null);
      setCreateDefaults({
        startAt: utcToLocalDateTimeInputValue(startIso, displayTimezone),
        endAt: utcToLocalDateTimeInputValue(endIso, displayTimezone),
        calendarId: params.calendarId || calendars?.items[0]?.id,
      });
      setDialogSessionKey(`create-${dateKey}-${hour}-${minute}`);
      setDialogOpen(true);
    },
    [
      displayTimezone,
      resolveDurationMinutes,
      params.calendarId,
      calendars?.items,
    ],
  );

  const openNewAppointment = useCallback(() => {
    const startIso = wallTimeInTimezoneToUtcIso(
      anchorDateKey,
      9,
      0,
      displayTimezone,
    );
    const duration = resolveDurationMinutes(params.calendarId || undefined);
    const endIso = new Date(
      new Date(startIso).getTime() + duration * 60_000,
    ).toISOString();
    setEditing(null);
    setCreateDefaults({
      startAt: utcToLocalDateTimeInputValue(startIso, displayTimezone),
      endAt: utcToLocalDateTimeInputValue(endIso, displayTimezone),
      calendarId: params.calendarId || calendars?.items[0]?.id,
    });
    setDialogSessionKey(`create-toolbar-${anchorDateKey}`);
    setDialogOpen(true);
  }, [
    anchorDateKey,
    displayTimezone,
    resolveDurationMinutes,
    params.calendarId,
    calendars?.items,
  ]);

  const openEdit = useCallback((appointment: Appointment) => {
    setCreateDefaults(null);
    setEditing(appointment);
    setDialogSessionKey(`edit-${appointment.id}`);
    setDialogOpen(true);
  }, []);

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

  const handleDateSelect = (dateKey: string) => {
    setParams({ date: dateKey });
  };

  const handleDayClick = (dateKey: string) => {
    setParams({ view: "day", date: dateKey });
  };

  const invalidateAppointments = () => {
    void queryClient.invalidateQueries({
      queryKey: queryKeys.appointments.all(),
    });
  };

  return {
    view,
    params,
    page,
    setParams,
    business,
    calendars,
    members,
    displayTimezone,
    anchorDateKey,
    appointments,
    isLoading,
    listData,
    dialogOpen,
    setDialogOpen,
    dialogSessionKey,
    editing,
    setEditing,
    deleteId,
    setDeleteId,
    createDefaults,
    setCreateDefaults,
    deleteMutation,
    openCreateAtSlot,
    openNewAppointment,
    openEdit,
    handleViewChange,
    handleDateNavigate,
    handleDateSelect,
    handleDayClick,
    invalidateAppointments,
  };
}
