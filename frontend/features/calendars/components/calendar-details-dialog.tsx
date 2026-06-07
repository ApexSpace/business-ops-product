"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Copy, ExternalLink, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  formatDurationLabel,
  getBookingTypeLabel,
  getGoogleSyncLabel,
  summarizeWeeklyAvailability,
  type Calendar,
  type CalendarDetail,
} from "@/features/calendars/schemas/calendar-profile";
import { getCalendar } from "@/features/calendars/api/calendars.api";
import { listAppointments } from "@/features/appointments/api/appointments.api";
import { queryKeys } from "@/lib/query/keys";
import {
  canUsePublicBooking,
  copyBookingLink,
  copyEmbedCode,
  openBookingPage,
  previewEmbed,
} from "@/features/calendars/utils/calendar-booking-utils";
import { DateTime } from "luxon";

interface CalendarDetailsDialogProps {
  calendarId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (id: string) => void;
  canManage: boolean;
  listSnapshot?: Calendar | null;
}

export function CalendarDetailsDialog({
  calendarId,
  open,
  onOpenChange,
  onEdit,
  canManage,
  listSnapshot,
}: CalendarDetailsDialogProps) {
  const { data: detail, isLoading } = useQuery({
    queryKey: queryKeys.calendars.detail(calendarId ?? ""),
    queryFn: () => getCalendar(calendarId!),
    enabled: open && !!calendarId,
  });

  const cal = detail ?? listSnapshot;

  const { data: upcoming } = useQuery({
    queryKey: ["calendars", calendarId, "upcoming-appointments"],
    queryFn: () =>
      listAppointments({
        calendarId: calendarId!,
        limit: 5,
        startFrom: new Date().toISOString(),
      }),
    enabled: open && !!calendarId,
  });

  const isPublic = cal ? canUsePublicBooking(cal) : false;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <DialogTitle>{cal?.name ?? "Calendar"}</DialogTitle>
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge variant={cal?.status === "ACTIVE" ? "default" : "secondary"}>
                  {cal?.status === "ACTIVE" ? "Active" : "Disabled"}
                </Badge>
                <Badge variant={isPublic ? "default" : "outline"}>
                  {isPublic ? "Public" : "Private"}
                </Badge>
              </div>
            </div>
            {canManage && calendarId ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  onOpenChange(false);
                  onEdit(calendarId);
                }}
              >
                <Pencil className="mr-1 size-4" />
                Edit
              </Button>
            ) : null}
          </div>
        </DialogHeader>
        <DialogBody className="space-y-6">
          {isLoading && !cal ? (
            <Skeleton className="h-48 w-full" />
          ) : cal ? (
            <>
              <SummaryCard cal={detail ?? listSnapshot ?? cal} />
              <section className="space-y-2 rounded-lg border p-4">
                <h3 className="text-sm font-medium">Booking link</h3>
                {isPublic ? (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => void copyBookingLink(cal)}
                    >
                      <Copy className="mr-1 size-4" />
                      Copy link
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => openBookingPage(cal)}
                    >
                      <ExternalLink className="mr-1 size-4" />
                      Open page
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Public booking is off. Enable it in Booking Page settings to
                    share this calendar.
                  </p>
                )}
              </section>
              {cal.embedEnabled && isPublic ? (
                <section className="space-y-2 rounded-lg border p-4">
                  <h3 className="text-sm font-medium">Website embed</h3>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => void copyEmbedCode(cal)}
                    >
                      Copy embed code
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => previewEmbed(cal)}
                    >
                      Preview embed
                    </Button>
                  </div>
                </section>
              ) : null}
              <section className="space-y-2 rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium">Upcoming appointments</h3>
                  <Button
                    nativeButton={false}
                    render={
                      <Link
                        href={`/business/appointments?calendarId=${calendarId}`}
                      />
                    }
                    variant="link"
                    size="sm"
                    className="h-auto p-0"
                  >
                    View all
                  </Button>
                </div>
                {upcoming?.items.length ? (
                  <ul className="space-y-2 text-sm">
                    {upcoming.items.map((apt) => (
                      <li key={apt.id} className="text-muted-foreground">
                        {DateTime.fromISO(apt.startAt).toLocaleString(
                          DateTime.DATETIME_MED,
                        )}{" "}
                        — {apt.title}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No upcoming appointments on this calendar.
                  </p>
                )}
              </section>
            </>
          ) : null}
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SummaryCard({ cal }: { cal: CalendarDetail | Calendar }) {
  const availability =
    "availability" in cal && cal.availability?.length
      ? summarizeWeeklyAvailability(cal.availability)
      : "—";
  return (
    <section className="grid gap-3 rounded-lg bg-muted/30 p-4 text-sm sm:grid-cols-2">
      <div>
        <span className="text-muted-foreground">Type</span>
        <p className="font-medium">{getBookingTypeLabel(cal.type as never)}</p>
      </div>
      <div>
        <span className="text-muted-foreground">Duration</span>
        <p className="font-medium">
          {formatDurationLabel(cal.defaultDurationMinutes)}
        </p>
      </div>
      <div>
        <span className="text-muted-foreground">Timezone</span>
        <p className="font-medium">{cal.timezone}</p>
      </div>
      <div>
        <span className="text-muted-foreground">Availability</span>
        <p className="font-medium">{availability}</p>
      </div>
      <div>
        <span className="text-muted-foreground">Staff</span>
        <p className="font-medium">
          {"staff" in cal && cal.staff
            ? cal.staff.length
            : (cal.staffCount ?? 0)}
        </p>
      </div>
      <div>
        <span className="text-muted-foreground">Google Calendar</span>
        <p className="font-medium">{getGoogleSyncLabel(cal)}</p>
      </div>
    </section>
  );
}
