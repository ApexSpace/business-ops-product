"use client";

import { use, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { DateTime } from "luxon";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  createPublicBooking,
  getPublicBookingAvailability,
  getPublicBookingCalendar,
} from "@/features/public-booking/api/public-booking.api";
import type {
  PublicBookingCalendar,
  PublicBookingConfirmation,
  PublicBookingSlot,
} from "@/features/public-booking/schemas/public-booking";
import { normalizeTimezone } from "@/features/calendars/utils/timezone";
import { phoneToApiFields } from "@/lib/forms/phone";
import { getBookingErrorView } from "@/features/public-booking/utils/booking-errors";
import { formatSlotSummary } from "@/features/public-booking/utils/booking-format";
import { useIsCompactBooking } from "@/features/public-booking/hooks/use-compact-booking";
import { BookingInfoPanel } from "@/features/public-booking/components/booking-info-panel";
import { BookingMobileHeader } from "@/features/public-booking/components/booking-mobile-header";
import { BookingMonthCalendar } from "@/features/public-booking/components/booking-month-calendar";
import { BookingProgressDots } from "@/features/public-booking/components/booking-progress-dots";
import { BookingTimeSlots } from "@/features/public-booking/components/booking-time-slots";
import { BookingDetailsForm } from "@/features/public-booking/components/booking-details-form";
import { BookingSuccessView } from "@/features/public-booking/components/booking-success-view";
import { BookingTimezoneSelect } from "@/features/public-booking/components/booking-timezone-select";

type Phase = "schedule" | "details" | "success";
type ScheduleStep = "date" | "time";

interface PublicBookingPageProps {
  slug: string;
  embed?: boolean;
}

function resolveAccent(calendar: PublicBookingCalendar): string {
  return calendar.brandColor ?? calendar.color ?? "#0069ff";
}

export function PublicBookingPage({ slug, embed = false }: PublicBookingPageProps) {
  const isCompact = useIsCompactBooking();
  const [phase, setPhase] = useState<Phase>("schedule");
  const [scheduleStep, setScheduleStep] = useState<ScheduleStep>("date");
  const [viewerTimezone, setViewerTimezone] = useState(() =>
    normalizeTimezone(
      typeof window !== "undefined"
        ? Intl.DateTimeFormat().resolvedOptions().timeZone
        : "UTC",
    ),
  );
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [pendingSlot, setPendingSlot] = useState<PublicBookingSlot | null>(null);
  const [confirmedSlot, setConfirmedSlot] = useState<PublicBookingSlot | null>(
    null,
  );
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [confirmation, setConfirmation] =
    useState<PublicBookingConfirmation | null>(null);

  const {
    data: calendar,
    isLoading: calendarLoading,
    error: calendarError,
  } = useQuery({
    queryKey: ["public-booking-calendar", slug],
    queryFn: () => getPublicBookingCalendar(slug),
    enabled: !!slug,
    retry: false,
  });

  const availabilityRange = useMemo(() => {
    const tz = normalizeTimezone(viewerTimezone);
    const start = DateTime.now().setZone(tz).startOf("day");
    const end = start.plus({
      days: calendar?.bookingRules.maxBookingDays ?? 60,
    });
    return {
      from: start.toUTC().toISO()!,
      to: end.toUTC().toISO()!,
      timezone: tz,
    };
  }, [viewerTimezone, calendar?.bookingRules.maxBookingDays]);

  const {
    data: availability = [],
    isLoading: availabilityLoading,
    isFetching: availabilityFetching,
  } = useQuery({
    queryKey: ["public-booking-availability", slug, availabilityRange],
    queryFn: () => getPublicBookingAvailability(slug, availabilityRange),
    enabled: !!calendar && !!slug,
    placeholderData: (prev) => prev,
  });

  const bookableDateSet = useMemo(() => {
    const set = new Set<string>();
    for (const day of availability) {
      if (day.slots.length > 0) set.add(day.date);
    }
    return set;
  }, [availability]);

  const slotsForSelectedDate = useMemo(() => {
    if (!selectedDate) return [];
    const day = availability.find((d) => d.date === selectedDate);
    return day?.slots.filter((s) => s.available !== false) ?? [];
  }, [availability, selectedDate]);

  useEffect(() => {
    if (selectedDate && !bookableDateSet.has(selectedDate)) {
      setSelectedDate(null);
      setPendingSlot(null);
      if (isCompact) setScheduleStep("date");
    }
  }, [bookableDateSet, selectedDate, isCompact]);

  useEffect(() => {
    if (!isCompact) return;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [scheduleStep, phase, isCompact]);

  const handleTimezoneChange = (tz: string) => {
    setViewerTimezone(normalizeTimezone(tz));
    setPendingSlot(null);
    setConfirmedSlot(null);
    if (phase === "details") {
      setPhase("schedule");
      if (isCompact) setScheduleStep("date");
    }
  };

  const bookMutation = useMutation({
    mutationFn: () => {
      const slot = confirmedSlot;
      if (!slot || !calendar) throw new Error("Missing slot");
      const phoneFields = phoneToApiFields(customerPhone);
      return createPublicBooking(slug, {
        startAt: slot.startAt,
        endAt: slot.endAt,
        timezone: viewerTimezone,
        customerName: customerName.trim(),
        customerEmail: customerEmail.trim() || undefined,
        phoneCountryCode: phoneFields.phoneCountryCode ?? undefined,
        phoneNumber: phoneFields.phoneNumber ?? undefined,
        notes: notes.trim() || undefined,
        source: embed ? "BOOKING_WIDGET" : "PUBLIC_LINK",
      });
    },
    onSuccess: (result) => {
      setConfirmation(result);
      setPhase("success");
    },
  });

  if (calendarLoading) {
    return <BookingPageSkeleton compact={isCompact} />;
  }

  if (calendarError || !calendar) {
    const err = getBookingErrorView(calendarError);
    return <BookingUnavailable title={err.title} message={err.message} />;
  }

  const accent = resolveAccent(calendar);

  const slotSummary =
    confirmedSlot && selectedDate
      ? formatSlotSummary(
          selectedDate,
          confirmedSlot,
          viewerTimezone,
          calendar.durationMinutes,
        )
      : null;

  const availabilityLoadingState =
    availabilityLoading || availabilityFetching;

  const selectedDateLabel = selectedDate
    ? DateTime.fromISO(selectedDate).toFormat("ccc, LLL d")
    : null;

  if (phase === "success" && confirmation) {
    return (
      <div
        className={cn(
          "mx-auto w-full overflow-hidden rounded-xl border bg-card shadow-lg",
          embed ? "max-w-3xl" : "max-w-4xl",
        )}
      >
        <BookingSuccessView
          calendar={calendar}
          confirmation={confirmation}
          customerName={customerName}
          accentColor={accent}
          embed={embed}
          compact={isCompact}
        />
      </div>
    );
  }

  if (isCompact) {
    return (
      <div
        className={cn(
          "mx-auto flex w-full flex-col overflow-hidden rounded-xl border bg-card shadow-lg",
          embed ? "max-w-3xl" : "max-w-lg",
        )}
        style={{ ["--booking-accent" as string]: accent }}
      >
        {phase === "schedule" ? (
          <BookingMobileHeader
            calendar={calendar}
            accentColor={accent}
            step={scheduleStep}
            subtitle={calendar.title}
            metaLabel={
              scheduleStep === "time" && selectedDateLabel
                ? selectedDateLabel
                : undefined
            }
            onBack={
              scheduleStep === "time"
                ? () => {
                    setScheduleStep("date");
                    setPendingSlot(null);
                  }
                : undefined
            }
          />
        ) : null}

        <div className="flex flex-col">
          {phase === "schedule" && scheduleStep === "date" ? (
            <div className="px-4 py-3">
              <p className="mb-3 text-sm font-semibold">Select a date</p>
              <BookingMonthCalendar
                timezone={viewerTimezone}
                bookableDates={bookableDateSet}
                selectedDate={selectedDate}
                maxBookingDays={calendar.bookingRules.maxBookingDays}
                onSelectDate={(date) => {
                  setSelectedDate(date);
                  setPendingSlot(null);
                  setScheduleStep("time");
                }}
                accentColor={accent}
              />
              {availabilityLoadingState && bookableDateSet.size === 0 ? (
                <p className="mt-3 text-center text-xs text-muted-foreground">
                  Loading availability…
                </p>
              ) : null}
              <div className="mt-4">
                <BookingTimezoneSelect
                  value={viewerTimezone}
                  onChange={handleTimezoneChange}
                />
              </div>
              <BookingProgressDots
                step="date"
                accentColor={accent}
                className="mt-4"
              />
            </div>
          ) : null}

          {phase === "schedule" && scheduleStep === "time" ? (
            <div className="flex flex-col">
              <p className="border-b px-4 py-2.5 text-sm font-semibold">
                Select a time
              </p>
              <BookingTimeSlots
                slots={slotsForSelectedDate}
                loading={availabilityLoadingState}
                selectedDate={selectedDate}
                timezone={viewerTimezone}
                durationMinutes={calendar.durationMinutes}
                pendingSlotStart={pendingSlot?.startAt ?? null}
                accentColor={accent}
                onSelectSlot={(slot) => setPendingSlot(slot)}
                onConfirmSlot={() => {
                  if (pendingSlot) {
                    setConfirmedSlot(pendingSlot);
                    setPendingSlot(null);
                    setPhase("details");
                  }
                }}
                fullHeight
              />
            </div>
          ) : null}

          {phase === "details" && confirmedSlot && selectedDate && slotSummary ? (
            <BookingDetailsForm
              calendar={calendar}
              accentColor={accent}
              summary={slotSummary}
              customerName={customerName}
              customerEmail={customerEmail}
              customerPhone={customerPhone}
              notes={notes}
              submitting={bookMutation.isPending}
              submitError={!!bookMutation.error}
              onBack={() => {
                setPhase("schedule");
                setConfirmedSlot(null);
                setScheduleStep("time");
              }}
              onChange={(field, value) => {
                if (field === "customerName") setCustomerName(value);
                if (field === "customerEmail") setCustomerEmail(value);
                if (field === "customerPhone") setCustomerPhone(value);
                if (field === "notes") setNotes(value);
              }}
              onSubmit={() => bookMutation.mutate()}
              compact
            />
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "mx-auto w-full overflow-hidden rounded-xl border bg-card shadow-lg",
        embed ? "max-w-4xl" : "max-w-5xl",
      )}
      style={{ ["--booking-accent" as string]: accent }}
    >
      <div className="flex flex-col lg:flex-row lg:min-h-[560px]">
        <aside className="lg:w-[38%] lg:shrink-0">
          <BookingInfoPanel
            calendar={calendar}
            accentColor={accent}
            timezone={viewerTimezone}
            onTimezoneChange={handleTimezoneChange}
            summary={
              slotSummary
                ? {
                    dateLabel: slotSummary.dateLabel,
                    timeLabel: slotSummary.timeLabel,
                  }
                : null
            }
          />
        </aside>

        <div className="flex flex-1 flex-col border-t lg:border-t-0 lg:border-l">
          {phase === "schedule" ? (
            <div className="flex flex-1 flex-col md:flex-row">
              <div className="border-b p-4 sm:p-6 md:w-[55%] md:border-b-0 md:border-r lg:p-8">
                <p className="mb-4 text-sm font-semibold">Select a date</p>
                <BookingMonthCalendar
                  timezone={viewerTimezone}
                  bookableDates={bookableDateSet}
                  selectedDate={selectedDate}
                  maxBookingDays={calendar.bookingRules.maxBookingDays}
                  onSelectDate={(date) => {
                    setSelectedDate(date);
                    setPendingSlot(null);
                  }}
                  accentColor={accent}
                />
                {availabilityLoadingState && bookableDateSet.size === 0 ? (
                  <p className="mt-3 text-center text-xs text-muted-foreground">
                    Loading availability…
                  </p>
                ) : null}
              </div>

              <div className="flex flex-1 flex-col md:w-[45%]">
                <p className="border-b px-4 py-3 text-sm font-semibold sm:px-6">
                  {selectedDateLabel ?? "Select a time"}
                </p>
                <BookingTimeSlots
                  slots={slotsForSelectedDate}
                  loading={availabilityLoadingState}
                  selectedDate={selectedDate}
                  timezone={viewerTimezone}
                  durationMinutes={calendar.durationMinutes}
                  pendingSlotStart={pendingSlot?.startAt ?? null}
                  accentColor={accent}
                  onSelectSlot={(slot) => setPendingSlot(slot)}
                  onConfirmSlot={() => {
                    if (pendingSlot) {
                      setConfirmedSlot(pendingSlot);
                      setPendingSlot(null);
                      setPhase("details");
                    }
                  }}
                />
              </div>
            </div>
          ) : (
            confirmedSlot &&
            selectedDate &&
            slotSummary && (
              <BookingDetailsForm
                calendar={calendar}
                accentColor={accent}
                summary={slotSummary}
                customerName={customerName}
                customerEmail={customerEmail}
                customerPhone={customerPhone}
                notes={notes}
                submitting={bookMutation.isPending}
                submitError={!!bookMutation.error}
                onBack={() => {
                  setPhase("schedule");
                  setConfirmedSlot(null);
                }}
                onChange={(field, value) => {
                  if (field === "customerName") setCustomerName(value);
                  if (field === "customerEmail") setCustomerEmail(value);
                  if (field === "customerPhone") setCustomerPhone(value);
                  if (field === "notes") setNotes(value);
                }}
                onSubmit={() => bookMutation.mutate()}
              />
            )
          )}
        </div>
      </div>
    </div>
  );
}

function BookingPageSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={cn(
        "mx-auto overflow-hidden rounded-xl border bg-card shadow-lg",
        compact ? "max-w-lg" : "max-w-5xl w-full",
      )}
    >
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-3 p-12 text-muted-foreground",
          compact ? "min-h-[480px]" : "min-h-[480px]",
        )}
      >
        <Loader2 className="size-8 animate-spin" style={{ color: "#0069ff" }} />
        <p className="text-sm">Loading scheduling page…</p>
      </div>
    </div>
  );
}

function BookingUnavailable({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <div className="mx-auto max-w-lg rounded-xl border bg-card p-8 text-center shadow-sm sm:p-10">
      <h1 className="text-xl font-semibold">{title}</h1>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        {message}
      </p>
    </div>
  );
}

export default function PublicBookingRoutePage({
  params,
  embed = false,
}: {
  params: Promise<{ slug: string }>;
  embed?: boolean;
}) {
  const { slug } = use(params);
  return <PublicBookingPage slug={slug} embed={embed} />;
}
