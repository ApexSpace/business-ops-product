"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppointmentFormDialog } from "@/components/appointments/appointment-form-dialog";
import { AppointmentListView } from "@/components/appointments/calendar/appointment-list-view";
import { CalendarFilters } from "@/components/appointments/calendar/calendar-filters";
import { CalendarToolbar } from "@/components/appointments/calendar/calendar-toolbar";
import { DayCalendarView } from "@/components/appointments/calendar/day-calendar-view";
import { MonthCalendarView } from "@/components/appointments/calendar/month-calendar-view";
import { WeekCalendarView } from "@/components/appointments/calendar/week-calendar-view";
import { ConfirmDeleteDialog } from "@/components/forms/confirm-delete-dialog";
import { ListPageSkeleton } from "@/components/layout/list-page";
import { PageHeader } from "@/components/layout/page-header";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useListSearchParams } from "@/hooks/use-list-search-params";
import { apiClient } from "@/lib/api-client";
import type { Appointment } from "@/lib/appointment-profile";
import type { Calendar } from "@/lib/calendar-profile";
import type { CalendarViewMode } from "@/lib/calendar-dates";
import { queryKeys } from "@/lib/query-keys";
import {
  getVisibleUtcRange,
  navigateDateKeyInTimezone,
  resolveAppointmentDisplayTimezone,
  todayDateKeyInTimezone,
  toIsoRangeBound,
  utcToLocalDateTimeInputValue,
  wallTimeInTimezoneToUtcIso,
} from "@/lib/timezone";
import type { Business, BusinessMember, PaginatedResult } from "@/types/api";

const PARAMS_SCHEMA = {
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

export function AppointmentsCalendarPage() {
  return (
    <Suspense fallback={<ListPageSkeleton />}>
      <AppointmentsCalendarPageContent />
    </Suspense>
  );
}

function AppointmentsCalendarPageContent() {
  const queryClient = useQueryClient();
  const urlInitDone = useRef(false);
  const [isClient, setIsClient] = useState(false);
  const { params, page, setParams } = useListSearchParams(PARAMS_SCHEMA);

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
    queryFn: () => apiClient<Business>("businesses/current"),
  });

  const { data: calendars } = useQuery({
    queryKey: queryKeys.calendars.list({ limit: 100 }),
    queryFn: () =>
      apiClient<PaginatedResult<Calendar>>("calendars", {
        searchParams: { page: 1, limit: 100 },
      }),
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

  // Run URL defaults once after hydration (browser refresh safe).
  useEffect(() => {
    if (!isClient || urlInitDone.current) return;

    const needsDate = !params.date;
    const needsMobileDayView = params.view === "week" && isMobileViewport();

    if (!needsDate && !needsMobileDayView) {
      urlInitDone.current = true;
      return;
    }

    const updates: Partial<Record<keyof typeof PARAMS_SCHEMA, string>> = {};
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
    queryFn: () =>
      apiClient<PaginatedResult<BusinessMember>>("businesses/current/members", {
        searchParams: { page: 1, limit: 100 },
      }),
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

  const {
    data: calendarData,
    isLoading: calendarLoading,
  } = useQuery({
    queryKey: queryKeys.appointments.list(calendarQueryFilters),
    queryFn: () =>
      apiClient<PaginatedResult<Appointment>>("appointments", {
        searchParams: {
          page: 1,
          limit: CALENDAR_FETCH_LIMIT,
          sortOrder: "asc",
          startFrom: appointmentRange!.startFrom,
          startTo: appointmentRange!.startTo,
          ...(params.calendarId ? { calendarId: params.calendarId } : {}),
          ...(params.assignedToId
            ? { assignedToId: params.assignedToId }
            : {}),
          ...(params.status ? { status: params.status } : {}),
        },
      }),
    enabled: view !== "list" && !!appointmentRange,
  });

  const { data: listData, isLoading: listLoading } = useQuery({
    queryKey: queryKeys.appointments.list(listQueryFilters),
    queryFn: () =>
      apiClient<PaginatedResult<Appointment>>("appointments", {
        searchParams: {
          page,
          limit: LIST_PAGE_LIMIT,
          ...(debouncedSearch ? { search: debouncedSearch } : {}),
          ...(params.calendarId ? { calendarId: params.calendarId } : {}),
          ...(params.assignedToId
            ? { assignedToId: params.assignedToId }
            : {}),
          ...(params.status ? { status: params.status } : {}),
        },
      }),
    enabled: view === "list",
  });

  const appointments = view === "list" ? (listData?.items ?? []) : (calendarData?.items ?? []);
  const isLoading = view === "list" ? listLoading : calendarLoading;

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiClient(`appointments/${id}`, {
        method: "DELETE",
        searchParams: { confirm: true },
      }),
    onSuccess: async () => {
      toast.success("Appointment deleted");
      setDeleteId(null);
      await queryClient.invalidateQueries({ queryKey: queryKeys.appointments.all() });
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

  return (
    <div className="space-y-[var(--page-stack-gap)]">
      <PageHeader
        title="Appointments"
        description="Schedule and manage appointments across your business calendars."
      />

      <CalendarToolbar
        view={view}
        onViewChange={handleViewChange}
        anchorDateKey={anchorDateKey}
        timezone={displayTimezone}
        onPrevious={() => handleDateNavigate(-1)}
        onToday={() => handleDateNavigate(0)}
        onNext={() => handleDateNavigate(1)}
        onDateSelect={handleDateSelect}
        onNewAppointment={openNewAppointment}
        filters={
          <CalendarFilters
            showSearch={view === "list"}
            search={params.search}
            onSearchChange={(search) => setParams({ search, page: "1" })}
            calendarId={params.calendarId}
            onCalendarIdChange={(calendarId) =>
              setParams({ calendarId, page: "1" })
            }
            assignedToId={params.assignedToId}
            onAssignedToIdChange={(assignedToId) =>
              setParams({ assignedToId, page: "1" })
            }
            status={params.status}
            onStatusChange={(status) => setParams({ status, page: "1" })}
            calendars={calendars?.items}
            members={members?.items}
          />
        }
      />

      {view === "day" ? (
        <DayCalendarView
          dateKey={anchorDateKey}
          timezone={displayTimezone}
          calendars={calendars?.items}
          businessTimezone={business?.timezone}
          appointments={appointments}
          isLoading={isLoading}
          onAppointmentClick={openEdit}
          onSlotClick={openCreateAtSlot}
        />
      ) : null}

      {view === "week" ? (
        <WeekCalendarView
          anchorDateKey={anchorDateKey}
          timezone={displayTimezone}
          calendars={calendars?.items}
          businessTimezone={business?.timezone}
          appointments={appointments}
          isLoading={isLoading}
          onAppointmentClick={openEdit}
          onSlotClick={openCreateAtSlot}
        />
      ) : null}

      {view === "month" ? (
        <MonthCalendarView
          anchorDateKey={anchorDateKey}
          timezone={displayTimezone}
          calendars={calendars?.items}
          businessTimezone={business?.timezone}
          appointments={appointments}
          isLoading={isLoading}
          onAppointmentClick={openEdit}
          onDayClick={handleDayClick}
        />
      ) : null}

      {view === "list" ? (
        <AppointmentListView
          appointments={appointments}
          timezone={displayTimezone}
          calendars={calendars?.items}
          businessTimezone={business?.timezone}
          isLoading={isLoading}
          page={page}
          meta={listData?.meta}
          onPageChange={(p) => setParams({ page: String(p) })}
          onEdit={openEdit}
          onDelete={setDeleteId}
        />
      ) : null}

      {dialogOpen ? (
        <AppointmentFormDialog
          key={dialogSessionKey}
          sessionKey={dialogSessionKey}
          open
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) {
              setCreateDefaults(null);
              setEditing(null);
            }
          }}
          appointment={editing}
          businessTimezone={business?.timezone}
          defaultStartAt={createDefaults?.startAt}
          defaultEndAt={createDefaults?.endAt}
          defaultCalendarId={createDefaults?.calendarId}
          isDeletePending={deleteMutation.isPending}
          onDelete={
            editing
              ? () => {
                  setDeleteId(editing.id);
                  setDialogOpen(false);
                  setEditing(null);
                }
              : undefined
          }
          onSuccess={() => {
            void queryClient.invalidateQueries({
              queryKey: queryKeys.appointments.all(),
            });
          }}
        />
      ) : null}

      <ConfirmDeleteDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete appointment"
        description="This appointment will be removed from your schedule."
        isPending={deleteMutation.isPending}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
      />
    </div>
  );
}
