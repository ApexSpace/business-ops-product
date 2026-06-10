"use client";

import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listPlatformBusinessSubscriptionEvents } from "@/features/platform/api/business-access.api";
import { queryKeys } from "@/lib/query/keys";

const SEVERITY_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  INFO: "secondary",
  WARNING: "outline",
  CRITICAL: "destructive",
};

export function SubscriptionEventsSection({ businessId }: { businessId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.platform.businesses.subscriptionEvents(businessId, {
      limit: 15,
    }),
    queryFn: () =>
      listPlatformBusinessSubscriptionEvents(businessId, { limit: 15 }),
  });

  const events = data?.items ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">History</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading history…</p>
        ) : events.length === 0 ? (
          <p className="text-sm text-muted-foreground">No subscription events yet.</p>
        ) : (
          <div className="space-y-3">
            {events.map((event) => (
              <div key={event.id} className="rounded-md border p-3 space-y-2">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-sm">{event.title}</p>
                    {event.statusTransition && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {event.statusTransition}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <Badge variant={SEVERITY_VARIANT[event.severity] ?? "secondary"}>
                      {event.severity}
                    </Badge>
                    <Badge variant="outline">{event.source}</Badge>
                  </div>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span>{new Date(event.createdAt).toLocaleString()}</span>
                  {event.createdByNameSnapshot && (
                    <span>by {event.createdByNameSnapshot}</span>
                  )}
                  {event.actionKey && <span>action: {event.actionKey}</span>}
                </div>
                {event.planTierLabel ? (
                  <p className="text-xs text-muted-foreground">
                    Plan: {event.planTierLabel}
                  </p>
                ) : null}
                {event.paymentSnippet ? (
                  <p className="text-xs text-muted-foreground">
                    Payment: {event.paymentSnippet}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
