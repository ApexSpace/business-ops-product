"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  listPlatformBusinessAddons,
  syncPlatformBusinessIncludedAddons,
} from "@/features/platform/api/business-access.api";
import { queryKeys } from "@/lib/query/keys";

export function BusinessAddonPackagingCard({
  businessId,
  canUpdate,
}: {
  businessId: string;
  canUpdate: boolean;
}) {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: [...queryKeys.platform.businesses.access(businessId), "addons"],
    queryFn: () => listPlatformBusinessAddons(businessId),
  });

  const syncIncluded = useMutation({
    mutationFn: () => syncPlatformBusinessIncludedAddons(businessId),
    onSuccess: (result) => {
      const count = result.grantedAddonIds?.length ?? 0;
      toast.success(
        count > 0
          ? `Granted ${count} included add-on${count === 1 ? "" : "s"}`
          : "Already up to date",
      );
      void qc.invalidateQueries({
        queryKey: [
          ...queryKeys.platform.businesses.access(businessId),
          "addons",
        ],
      });
    },
    onError: (err: Error) => toast.error(err.message || "Sync failed"),
  });

  const items = data?.items ?? [];
  const grandfatheredCount = items.filter((i) => i.grandfathered).length;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <CardTitle className="text-base">Add-ons</CardTitle>
        <div className="flex flex-wrap gap-2">
          {grandfatheredCount > 0 ? (
            <Link href="/platform/operations?tab=ADDON_PACKAGING">
              <Button type="button" size="sm" variant="outline">
                Operations ({grandfatheredCount})
              </Button>
            </Link>
          ) : null}
          {canUpdate ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={syncIncluded.isPending || !data?.tierId}
              onClick={() => syncIncluded.mutate()}
            >
              {syncIncluded.isPending ? "…" : "Grant missing"}
            </Button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">None</p>
        ) : (
          items.map((item) => (
            <div
              key={item.addonId}
              className="flex items-center justify-between gap-2 rounded-md border px-3 py-2"
            >
              <span className="text-sm font-medium">{item.addonName}</span>
              {item.grandfathered ? (
                <Badge variant="destructive">Grandfathered</Badge>
              ) : (
                <Badge variant="secondary">
                  {item.source === "INCLUDED" ? "Included" : "Purchased"}
                </Badge>
              )}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
