"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { StatusBadge } from "@/components/data-display/status-badge";
import { SearchableSelect } from "@/components/forms/searchable-select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  applyPlatformBusinessSnapshot,
  getPlatformBusinessUtilization,
} from "@/features/platform/api/platform.api";
import { listPlatformSnapshots } from "@/features/platform/api/snapshots.api";
import { queryKeys } from "@/lib/query/keys";
import type { Business } from "@/features/platform/types";

function formatAssetType(assetType: string): string {
  return assetType
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function PlatformBusinessBlueprintTab({
  business,
  canUpdate,
}: {
  business: Business;
  canUpdate: boolean;
}) {
  const queryClient = useQueryClient();
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string | null>(
    business.snapshotId ?? null,
  );
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { data: utilization, isLoading } = useQuery({
    queryKey: queryKeys.platform.businesses.utilization(business.id),
    queryFn: () => getPlatformBusinessUtilization(business.id),
    staleTime: 60_000,
  });

  const { data: snapshots } = useQuery({
    queryKey: queryKeys.platform.snapshots.list({
      page: 1,
      limit: 100,
      status: "PUBLISHED",
    }),
    queryFn: () =>
      listPlatformSnapshots({ page: 1, limit: 100, status: "PUBLISHED" }),
    enabled: canUpdate,
  });

  const snapshotOptions =
    snapshots?.items.map((s) => ({ value: s.id, label: s.name })) ?? [];

  const applyMutation = useMutation({
    mutationFn: () => {
      if (!selectedSnapshotId) {
        throw new Error("Select a snapshot");
      }
      return applyPlatformBusinessSnapshot(business.id, {
        snapshotId: selectedSnapshotId,
      });
    },
    onSuccess: () => {
      toast.success("Snapshot applied");
      setConfirmOpen(false);
      void queryClient.invalidateQueries({
        queryKey: queryKeys.platform.businesses.detail(business.id),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.platform.businesses.utilization(business.id),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.business.snapshotContext(business.id),
      });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading) {
    return <Skeleton className="h-48 w-full" />;
  }

  const blueprint = utilization?.blueprint;
  const provisions = blueprint?.provisionsByType ?? {};

  return (
    <div className="space-y-6">
      <section className="space-y-3 rounded-lg border p-4">
        <h3 className="text-sm font-medium">Current snapshot</h3>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Name</dt>
            <dd className="font-medium">
              {business.snapshotName ?? blueprint?.snapshotName ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Status</dt>
            <dd>
              {business.snapshotStatus ?? blueprint?.snapshotStatus ? (
                <StatusBadge
                  status={
                    (business.snapshotStatus ??
                      blueprint?.snapshotStatus) as "PUBLISHED"
                  }
                  domain="snapshot"
                />
              ) : (
                "—"
              )}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Applied</dt>
            <dd>
              {business.snapshotAppliedAt ?? blueprint?.snapshotAppliedAt
                ? new Date(
                    business.snapshotAppliedAt ??
                      blueprint!.snapshotAppliedAt!,
                  ).toLocaleString()
                : "—"}
            </dd>
          </div>
        </dl>
      </section>

      <section className="space-y-3 rounded-lg border p-4">
        <h3 className="text-sm font-medium">Industry</h3>
        <p className="text-sm text-muted-foreground">
          Business classification metadata. Navigation and terminology come from
          the applied snapshot.
        </p>
        <p className="text-sm font-medium">
          {business.industry?.name ?? blueprint?.industryName ?? "—"}
        </p>
      </section>

      {canUpdate ? (
        <section className="space-y-4 rounded-lg border p-4">
          <h3 className="text-sm font-medium">Apply snapshot</h3>
          <SearchableSelect
            items={snapshotOptions}
            value={selectedSnapshotId}
            onValueChange={setSelectedSnapshotId}
            placeholder="Select published snapshot"
          />
          <div className="flex gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
            <p>
              Applying provisions default navigation, labels, pipelines, and
              related assets. Existing business data is not overwritten.
            </p>
          </div>
          <Button
            type="button"
            disabled={!selectedSnapshotId || applyMutation.isPending}
            onClick={() => setConfirmOpen(true)}
          >
            Apply snapshot
          </Button>
        </section>
      ) : null}

      <section className="space-y-3 rounded-lg border p-4">
        <h3 className="text-sm font-medium">Provision summary</h3>
        {Object.keys(provisions).length ? (
          <dl className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(provisions).map(([assetType, count]) => (
              <div
                key={assetType}
                className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2"
              >
                <dt className="text-muted-foreground">
                  {formatAssetType(assetType)}
                </dt>
                <dd className="font-medium tabular-nums">{count}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="text-sm text-muted-foreground">
            No provisions recorded for this business.
          </p>
        )}
      </section>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apply snapshot?</AlertDialogTitle>
            <AlertDialogDescription>
              Apply the selected blueprint to <strong>{business.name}</strong>?
              This provisions defaults without overwriting existing records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={applyMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={applyMutation.isPending}
              onClick={(e) => {
                e.preventDefault();
                applyMutation.mutate();
              }}
            >
              {applyMutation.isPending ? "Applying…" : "Confirm apply"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
