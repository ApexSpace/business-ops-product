"use client";

import { use, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  cancelPublicAppointment,
  getPublicAppointmentAvailability,
  getPublicAppointmentManage,
  reschedulePublicAppointment,
} from "@/features/public-appointment-manage/api/public-appointment-manage.api";
import { stripHtmlToPlainText } from "@/features/cancel-reschedule-settings/utils/self-service-labels";
import { ApiClientError } from "@/lib/api/errors";
import { cn } from "@/lib/utils";

function formatWhen(iso: string, timezone: string) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZone: timezone,
    }).format(new Date(iso));
  } catch {
    return new Date(iso).toLocaleString();
  }
}

function formatSlotLabel(iso: string, timezone: string) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZone: timezone,
    }).format(new Date(iso));
  } catch {
    return new Date(iso).toLocaleString();
  }
}

export function PublicAppointmentManagePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const queryClient = useQueryClient();
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [rescheduleMode, setRescheduleMode] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{
    startAt: string;
    endAt: string;
  } | null>(null);
  const [doneState, setDoneState] = useState<"cancelled" | "rescheduled" | null>(
    null,
  );
  const [rescheduledAt, setRescheduledAt] = useState<string | null>(null);

  const summaryQuery = useQuery({
    queryKey: ["public-appointment-manage", token],
    queryFn: () => getPublicAppointmentManage(token),
    retry: false,
  });

  const availabilityRange = useMemo(() => {
    const from = new Date();
    const to = new Date();
    to.setDate(to.getDate() + 14);
    return { from: from.toISOString(), to: to.toISOString() };
  }, []);

  const availabilityQuery = useQuery({
    queryKey: [
      "public-appointment-manage-availability",
      token,
      availabilityRange,
    ],
    queryFn: () =>
      getPublicAppointmentAvailability(token, {
        ...availabilityRange,
        timezone: summaryQuery.data?.timezone,
      }),
    enabled: Boolean(summaryQuery.data?.canReschedule && rescheduleMode),
  });

  const cancelMutation = useMutation({
    mutationFn: () => cancelPublicAppointment(token),
    onSuccess: () => {
      setDoneState("cancelled");
      setCancelDialogOpen(false);
    },
  });

  const rescheduleMutation = useMutation({
    mutationFn: (body: { startAt: string; endAt: string }) =>
      reschedulePublicAppointment(token, body),
    onSuccess: async (result) => {
      setRescheduledAt(result.startAt);
      setDoneState("rescheduled");
      await queryClient.invalidateQueries({
        queryKey: ["public-appointment-manage", token],
      });
    },
  });

  const summary = summaryQuery.data;
  const policyHtml = summary?.cancellationPolicyHtml?.trim();
  const policyPlain = useMemo(
    () => stripHtmlToPlainText(policyHtml),
    [policyHtml],
  );

  const availableSlots = useMemo(() => {
    return (availabilityQuery.data ?? []).flatMap((day) =>
      day.slots
        .filter((slot) => slot.available !== false)
        .map((slot) => ({
          startAt: slot.startAt,
          endAt: slot.endAt,
          label: formatSlotLabel(slot.startAt, summary?.timezone ?? "UTC"),
        })),
    );
  }, [availabilityQuery.data, summary?.timezone]);

  if (summaryQuery.isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (summaryQuery.isError || !summary) {
    const message =
      summaryQuery.error instanceof ApiClientError
        ? summaryQuery.error.message
        : "This appointment link is invalid or has expired.";
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-xl font-semibold">Appointment not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">{message}</p>
      </div>
    );
  }

  if (doneState === "cancelled") {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-xl font-semibold">Appointment cancelled</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your appointment with {summary.businessName} has been cancelled.
        </p>
      </div>
    );
  }

  if (doneState === "rescheduled") {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-xl font-semibold">Appointment rescheduled</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your new appointment time is{" "}
          {formatWhen(
            rescheduledAt ?? summary.startAt,
            summary.timezone,
          )}.
        </p>
      </div>
    );
  }

  const showCallBusiness = !summary.canCancel && !summary.canReschedule;

  return (
    <div className="mx-auto max-w-lg space-y-6 px-4 py-10">
      <div className="space-y-1 text-center">
        <p className="text-sm text-muted-foreground">{summary.businessName}</p>
        <h1 className="text-2xl font-semibold">Manage appointment</h1>
      </div>

      <div className="space-y-3 rounded-xl border bg-card p-5 text-sm">
        <div>
          <p className="text-muted-foreground">When</p>
          <p className="font-medium">
            {formatWhen(summary.startAt, summary.timezone)}
          </p>
        </div>
        {summary.serviceName ? (
          <div>
            <p className="text-muted-foreground">Service</p>
            <p className="font-medium">{summary.serviceName}</p>
          </div>
        ) : null}
        {summary.staffName ? (
          <div>
            <p className="text-muted-foreground">With</p>
            <p className="font-medium">{summary.staffName}</p>
          </div>
        ) : null}
      </div>

      {policyHtml || policyPlain ? (
        <div className="space-y-2 rounded-xl border bg-muted/20 p-4 text-sm">
          <p className="font-medium">Cancellation policy</p>
          {policyHtml ? (
            <div
              className="prose prose-sm max-w-none text-muted-foreground"
              dangerouslySetInnerHTML={{ __html: policyHtml }}
            />
          ) : (
            <p className="whitespace-pre-wrap text-muted-foreground">
              {policyPlain}
            </p>
          )}
        </div>
      ) : null}

      {showCallBusiness ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          <p className="font-medium">Please contact the business to make changes</p>
          <p className="mt-1 text-amber-900/80">
            Online changes are no longer available for this appointment.
            {summary.businessPhone ? (
              <>
                {" "}
                Call{" "}
                <a
                  href={`tel:${summary.businessPhone}`}
                  className="font-medium underline"
                >
                  {summary.businessPhone}
                </a>
                .
              </>
            ) : null}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {summary.canReschedule ? (
            <div className="space-y-3">
              <Button
                variant={rescheduleMode ? "secondary" : "default"}
                onClick={() => setRescheduleMode((value) => !value)}
              >
                {rescheduleMode ? "Hide reschedule options" : "Reschedule appointment"}
              </Button>
              {rescheduleMode ? (
                <div className="space-y-3 rounded-xl border p-4">
                  {availabilityQuery.isLoading ? (
                    <div className="flex justify-center py-6">
                      <Loader2 className="size-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : availableSlots.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No available times found in the next two weeks.
                    </p>
                  ) : (
                    <div className="grid gap-2">
                      {availableSlots.slice(0, 24).map((slot) => (
                        <button
                          key={slot.startAt}
                          type="button"
                          className={cn(
                            "rounded-md border px-3 py-2 text-left text-sm transition-colors",
                            selectedSlot?.startAt === slot.startAt
                              ? "border-primary bg-primary/5"
                              : "hover:bg-muted/50",
                          )}
                          onClick={() => setSelectedSlot(slot)}
                        >
                          {slot.label}
                        </button>
                      ))}
                    </div>
                  )}
                  {selectedSlot ? (
                    <Button
                      className="w-full"
                      onClick={() =>
                        rescheduleMutation.mutate({
                          startAt: selectedSlot.startAt,
                          endAt: selectedSlot.endAt,
                        })
                      }
                      disabled={rescheduleMutation.isPending}
                    >
                      {rescheduleMutation.isPending
                        ? "Saving…"
                        : "Confirm new time"}
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}
          {summary.canCancel ? (
            <Button
              variant="destructive"
              onClick={() => setCancelDialogOpen(true)}
              disabled={cancelMutation.isPending}
            >
              Cancel appointment
            </Button>
          ) : null}
        </div>
      )}

      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel appointment?</DialogTitle>
            <DialogDescription>
              This will cancel your appointment with {summary.businessName} on{" "}
              {formatWhen(summary.startAt, summary.timezone)}.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>
              Keep appointment
            </Button>
            <Button
              variant="destructive"
              onClick={() => cancelMutation.mutate()}
              disabled={cancelMutation.isPending}
            >
              {cancelMutation.isPending ? "Cancelling…" : "Cancel appointment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
