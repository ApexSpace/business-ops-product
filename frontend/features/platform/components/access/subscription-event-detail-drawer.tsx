"use client";

import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { StatusBadge } from "@/components/data-display/status-badge";
import { getPlatformBusinessSubscriptionEvent } from "@/features/platform/api/business-access.api";
import type { SubscriptionStateSnapshot } from "@/features/platform/types/business-subscription";
import {
  formatAccessImpact,
  formatSubscriptionEventSeverity,
  formatSubscriptionEventSource,
  formatSubscriptionEventType,
  formatSubscriptionStatus,
} from "@/features/platform/utils/access-labels";
import { queryKeys } from "@/lib/query/keys";

function StateBlock({
  label,
  state,
}: {
  label: string;
  state: SubscriptionStateSnapshot | null | undefined;
}) {
  if (!state) {
    return (
      <div className="rounded-md border p-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">No snapshot</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border p-3 space-y-2">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <dl className="grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted-foreground">Business status</dt>
          <dd>
            <StatusBadge status={state.businessStatus} domain="business" />
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Subscription</dt>
          <dd>
            {state.subscriptionStatus ? (
              <StatusBadge
                status={state.subscriptionStatus}
                domain="subscription"
              />
            ) : (
              "—"
            )}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Plan tier</dt>
          <dd>{state.planTierName ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Snapshot</dt>
          <dd>{state.snapshotName ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Access</dt>
          <dd>
            {state.accessResolution?.reasonLabel ??
              (state.accessResolution?.canAccessWorkspace
                ? "Can access"
                : "Cannot access")}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Period end</dt>
          <dd>
            {state.currentPeriodEnd
              ? new Date(state.currentPeriodEnd).toLocaleDateString()
              : "—"}
          </dd>
        </div>
      </dl>
      <details className="text-xs">
        <summary className="cursor-pointer text-muted-foreground">
          Raw JSON snapshot
        </summary>
        <pre className="mt-2 max-h-48 overflow-auto rounded bg-muted p-2 font-mono text-[11px]">
          {JSON.stringify(state, null, 2)}
        </pre>
      </details>
    </div>
  );
}

export function SubscriptionEventDetailDrawer({
  businessId,
  eventId,
  open,
  onOpenChange,
}: {
  businessId: string;
  eventId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: event, isLoading } = useQuery({
    queryKey: queryKeys.platform.businesses.subscriptionEvent(
      businessId,
      eventId ?? "",
    ),
    queryFn: () =>
      getPlatformBusinessSubscriptionEvent(businessId, eventId as string),
    enabled: open && Boolean(eventId),
  });

  if (!eventId) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full overflow-y-auto sm:max-w-xl"
      >
        {isLoading || !event ? (
          <>
            <SheetHeader>
              <SheetTitle>Loading event…</SheetTitle>
            </SheetHeader>
            <p className="px-4 text-sm text-muted-foreground">
              Fetching event details…
            </p>
          </>
        ) : (
          <>
            <SheetHeader>
              <SheetTitle>{event.title}</SheetTitle>
              <SheetDescription>
                {formatSubscriptionEventType(event.eventType)} ·{" "}
                {new Date(event.createdAt).toLocaleString()}
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-4 px-4 pb-6">
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">
                  {formatSubscriptionEventSource(event.source)}
                </Badge>
                <Badge variant="secondary">
                  {formatSubscriptionEventSeverity(event.severity)}
                </Badge>
              </div>

              {event.description ? (
                <p className="text-sm text-muted-foreground">
                  {event.description}
                </p>
              ) : null}

              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-muted-foreground">Actor</dt>
                  <dd>{event.createdByNameSnapshot ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Access Result</dt>
                  <dd>
                    {formatAccessImpact(
                      event.fromState?.accessResolution?.canAccessWorkspace,
                      event.toState?.accessResolution?.canAccessWorkspace,
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Status before</dt>
                  <dd>
                    {event.fromState?.subscriptionStatus
                      ? formatSubscriptionStatus(
                          event.fromState.subscriptionStatus,
                        )
                      : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Status after</dt>
                  <dd>
                    {event.toState?.subscriptionStatus
                      ? formatSubscriptionStatus(
                          event.toState.subscriptionStatus,
                        )
                      : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">From plan</dt>
                  <dd>{event.fromState?.planTierName ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">To plan</dt>
                  <dd>{event.toState?.planTierName ?? "—"}</dd>
                </div>
                {event.reason ? (
                  <div className="sm:col-span-2">
                    <dt className="text-muted-foreground">Reason</dt>
                    <dd>{event.reason}</dd>
                  </div>
                ) : null}
                {event.notes ? (
                  <div className="sm:col-span-2">
                    <dt className="text-muted-foreground">Notes</dt>
                    <dd className="whitespace-pre-wrap">{event.notes}</dd>
                  </div>
                ) : null}
              </dl>

              <div className="space-y-3">
                <StateBlock label="Before state" state={event.fromState} />
                <StateBlock label="After state" state={event.toState} />
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
