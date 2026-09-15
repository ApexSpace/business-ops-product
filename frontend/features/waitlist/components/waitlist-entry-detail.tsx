"use client";

import { useEffect, useState } from "react";
import { DateTime } from "luxon";
import { Loader2, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatTimeRange } from "@/features/public-booking/utils/booking-format";
import { useWaitlistMutations } from "@/features/waitlist/hooks/use-waitlist-mutations";
import type { WaitlistEntry } from "@/features/waitlist/types";
import { cn } from "@/lib/utils";

interface WaitlistEntryDetailProps {
  entry: WaitlistEntry;
  timezone: string;
  calendarId?: string;
  onBooked?: (appointmentId: string) => void;
}

function periodLabel(startAt: string, timezone: string): string {
  const hour = DateTime.fromISO(startAt, { zone: timezone }).hour;
  if (hour < 12) return "Morning";
  if (hour < 17) return "Afternoon";
  return "Evening";
}

export function WaitlistEntryDetail({
  entry,
  timezone,
  calendarId,
  onBooked,
}: WaitlistEntryDetailProps) {
  const { dismiss, book } = useWaitlistMutations();
  const openings = entry.matchedOpenings ?? [];
  const [selectedStartAt, setSelectedStartAt] = useState(
    openings[0]?.startAt ?? "",
  );

  useEffect(() => {
    setSelectedStartAt(entry.matchedOpenings?.[0]?.startAt ?? "");
  }, [entry.id, entry.updatedAt]);

  const selectedOpening =
    openings.find((slot) => slot.startAt === selectedStartAt) ?? openings[0];

  const preferredDateLabel = DateTime.fromISO(entry.preferredDate, {
    zone: timezone,
  }).toFormat("cccc, LLL d, yyyy");

  const timePreferences = [
    entry.preferredMorning ? "Morning" : null,
    entry.preferredAfternoon ? "Afternoon" : null,
    entry.preferredEvening ? "Evening" : null,
  ].filter(Boolean);

  const preferenceSummary =
    timePreferences.length === 0 || timePreferences.length === 3
      ? "Anytime"
      : timePreferences.join(" or ");

  const hasBookableOpening =
    entry.hasOpening && openings.length > 0 && selectedOpening;

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
      {hasBookableOpening ? (
        <section className="rounded-[14px] border border-emerald-200/80 bg-emerald-50/80 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/30">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[14px] font-semibold text-emerald-950 dark:text-emerald-100">
                Opening available
              </p>
              <p className="mt-1 text-[13px] text-emerald-800/90 dark:text-emerald-200/80">
                {preferredDateLabel} · {preferenceSummary}
              </p>
            </div>
          </div>

          <div className="mt-4 max-h-52 space-y-2 overflow-y-auto pr-0.5 scrollbar-thin">
            {openings.map((slot) => {
              const selected = selectedOpening.startAt === slot.startAt;
              return (
                <button
                  key={slot.startAt}
                  type="button"
                  onClick={() => setSelectedStartAt(slot.startAt)}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 rounded-[10px] border px-3.5 py-2.5 text-left transition-colors",
                    selected
                      ? "border-emerald-600 bg-white text-emerald-950 shadow-sm dark:border-emerald-500 dark:bg-emerald-950/60 dark:text-emerald-50"
                      : "border-emerald-100/80 bg-white/50 text-emerald-950 hover:bg-white dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-100 dark:hover:bg-emerald-950/40",
                  )}
                >
                  <span className="text-[13.5px] font-medium">
                    {formatTimeRange(slot.startAt, slot.endAt, timezone)}
                  </span>
                  <span className="shrink-0 text-[12px] text-emerald-700/80 dark:text-emerald-300/80">
                    {periodLabel(slot.startAt, timezone)}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-4 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-9 px-3"
              disabled={dismiss.isPending}
              onClick={() => dismiss.mutate(entry.id)}
            >
              Dismiss
            </Button>
            <Button
              type="button"
              size="sm"
              className="h-9 min-w-[88px] px-4"
              disabled={book.isPending || !selectedOpening}
              onClick={() =>
                book.mutate(
                  {
                    id: entry.id,
                    startAt: selectedOpening.startAt,
                    calendarId: calendarId || entry.calendarId || undefined,
                    staffId:
                      selectedOpening.staffId || entry.staff?.id || undefined,
                  },
                  {
                    onSuccess: (result) => onBooked?.(result.appointmentId),
                  },
                )
              }
            >
              {book.isPending ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : null}
              Book
            </Button>
          </div>
        </section>
      ) : null}

      <section className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-[18px] font-semibold tracking-tight">
              {entry.contact.name}
            </h3>
            <div className="mt-1.5 space-y-0.5 text-[13.5px] text-muted-foreground">
              {entry.contact.phone ? <p>{entry.contact.phone}</p> : null}
              {entry.contact.email ? <p>{entry.contact.email}</p> : null}
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            className="size-9 shrink-0 rounded-[9px]"
            aria-label="Message client"
          >
            <MessageSquare className="size-4" />
          </Button>
        </div>
      </section>

      <section className="rounded-[12px] border border-border/80 bg-muted/20 px-4 py-3.5">
        <p className="text-[14px] font-medium">{entry.service.name}</p>
        <p className="mt-1 text-[13px] text-muted-foreground">
          {entry.staff ? `with ${entry.staff.name}` : "with Anyone"}
          <span className="mx-1.5 text-border">·</span>
          {entry.service.durationMinutes} min
          {entry.service.price != null ? (
            <>
              <span className="mx-1.5 text-border">·</span>$
              {Number(entry.service.price).toFixed(2)}
            </>
          ) : null}
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
            Requested date
          </p>
          <p className="text-[13.5px] leading-snug">
            {preferredDateLabel}
            <span className="text-muted-foreground"> · {preferenceSummary}</span>
          </p>
        </div>
        {entry.comments ? (
          <div className="space-y-1 sm:col-span-2">
            <p className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
              Comments
            </p>
            <p className="text-[13.5px] leading-relaxed text-muted-foreground">
              {entry.comments}
            </p>
          </div>
        ) : null}
      </section>

      {!hasBookableOpening ? (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9"
            disabled={dismiss.isPending}
            onClick={() => dismiss.mutate(entry.id)}
          >
            Dismiss
          </Button>
        </div>
      ) : null}

      <footer className="space-y-2 border-t border-border/60 pt-4 text-[12px] text-muted-foreground">
        <p>
          Created{" "}
          {DateTime.fromISO(entry.createdAt).toFormat(
            "cccc, LLL d 'at' h:mm a",
          )}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <span>
            {entry.source === "ONLINE_BOOKING"
              ? "Created by online booking"
              : "Added by staff"}
          </span>
          <Badge variant="outline" className="font-normal capitalize">
            {entry.status.toLowerCase()}
          </Badge>
        </div>
      </footer>
    </div>
  );
}
