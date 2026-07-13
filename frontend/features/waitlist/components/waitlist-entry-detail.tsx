"use client";

import { DateTime } from "luxon";
import { Loader2, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { WaitlistEntry } from "@/features/waitlist/types";
import { useWaitlistMutations } from "@/features/waitlist/hooks/use-waitlist-mutations";
import { formatTimeRange } from "@/features/public-booking/utils/booking-format";

interface WaitlistEntryDetailProps {
  entry: WaitlistEntry;
  timezone: string;
  calendarId?: string;
  onBooked?: (appointmentId: string) => void;
}

export function WaitlistEntryDetail({
  entry,
  timezone,
  calendarId,
  onBooked,
}: WaitlistEntryDetailProps) {
  const { dismiss, book } = useWaitlistMutations();
  const preferredDateLabel = DateTime.fromISO(entry.preferredDate, {
    zone: timezone,
  }).toFormat("cccc, LLL d, yyyy");

  const timePreferences = [
    entry.preferredMorning ? "Morning" : null,
    entry.preferredAfternoon ? "Afternoon" : null,
    entry.preferredEvening ? "Evening" : null,
  ].filter(Boolean);

  const primaryOpening = entry.matchedOpenings[0];

  return (
    <div className="space-y-4">
      {entry.hasOpening && primaryOpening ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm font-medium text-emerald-900">
            Opening available
          </p>
          <p className="mt-1 text-sm text-emerald-800">
            {preferredDateLabel} ·{" "}
            {formatTimeRange(
              primaryOpening.startAt,
              primaryOpening.endAt,
              timezone,
            )}
          </p>
          <div className="mt-3 flex gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={dismiss.isPending}
              onClick={() => dismiss.mutate(entry.id)}
            >
              Dismiss
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={book.isPending}
              onClick={() =>
                book.mutate(
                  {
                    id: entry.id,
                    startAt: primaryOpening.startAt,
                    calendarId,
                    staffId: primaryOpening.staffId ?? entry.staff?.id,
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
        </div>
      ) : null}

      <div>
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">{entry.contact.name}</h3>
          <Button type="button" variant="ghost" size="icon-sm" aria-label="Message client">
            <MessageSquare className="size-4" />
          </Button>
        </div>
        {entry.contact.phone ? (
          <p className="text-sm text-muted-foreground">{entry.contact.phone}</p>
        ) : null}
        {entry.contact.email ? (
          <p className="text-sm text-muted-foreground">{entry.contact.email}</p>
        ) : null}
      </div>

      <div className="space-y-2 rounded-lg border p-3">
        <p className="font-medium">{entry.service.name}</p>
        <p className="text-sm text-muted-foreground">
          {entry.staff ? `with ${entry.staff.name}` : "with Anyone"} ·{" "}
          {entry.service.durationMinutes} min
        </p>
        {entry.service.price != null ? (
          <p className="text-sm">${Number(entry.service.price).toFixed(2)}</p>
        ) : null}
      </div>

      <div className="space-y-1 text-sm">
        <p className="font-medium">Requested date</p>
        <p className="text-muted-foreground">
          {preferredDateLabel}
          {timePreferences.length > 0
            ? ` · ${timePreferences.join(", ")}`
            : " · Anytime"}
        </p>
      </div>

      {entry.comments ? (
        <div className="space-y-1 text-sm">
          <p className="font-medium">Comments</p>
          <p className="text-muted-foreground">{entry.comments}</p>
        </div>
      ) : null}

      <div className="space-y-1 border-t pt-3 text-xs text-muted-foreground">
        <p>
          Created{" "}
          {DateTime.fromISO(entry.createdAt).toFormat("cccc, LLL d 'at' h:mm a")}
        </p>
        <p>
          Source:{" "}
          {entry.source === "ONLINE_BOOKING"
            ? "Created by online booking"
            : "Added by staff"}
        </p>
        <Badge variant="outline">{entry.status}</Badge>
      </div>
    </div>
  );
}
