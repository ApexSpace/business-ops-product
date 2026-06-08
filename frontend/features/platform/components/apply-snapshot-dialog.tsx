"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";
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
import { SearchableSelect } from "@/components/forms/searchable-select";
import { applyPlatformSnapshot } from "@/features/platform/api/snapshots.api";
import { getPlatformBusiness, listPlatformBusinesses } from "@/features/platform/api/platform.api";
import { queryKeys } from "@/lib/query/keys";
import type { SnapshotListItem } from "@/features/platform/types/snapshot";

interface ApplySnapshotDialogProps {
  snapshot: SnapshotListItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ApplySnapshotDialog({
  snapshot,
  open,
  onOpenChange,
}: ApplySnapshotDialogProps) {
  const queryClient = useQueryClient();
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [lastResult, setLastResult] = useState<string | null>(null);

  const { data: businesses } = useQuery({
    queryKey: queryKeys.platform.businesses.list({ page: 1, limit: 100 }),
    queryFn: () => listPlatformBusinesses({ page: 1, limit: 100 }),
    enabled: open,
  });

  const { data: selectedBusiness } = useQuery({
    queryKey: queryKeys.platform.businesses.detail(businessId ?? ""),
    queryFn: () => getPlatformBusiness(businessId!),
    enabled: open && !!businessId,
  });

  const mutation = useMutation({
    mutationFn: () => {
      if (!snapshot || !businessId) {
        throw new Error("Select a business");
      }
      return applyPlatformSnapshot(snapshot.id, { businessId });
    },
    onSuccess: () => {
      const businessName =
        businesses?.items.find((b) => b.id === businessId)?.name ?? "Business";
      const summary = `Applied "${snapshot?.name}" to ${businessName}. Navigation, terminology, and default assets were provisioned. Existing data was not overwritten.`;
      setLastResult(summary);
      toast.success("Snapshot applied successfully", {
        description: summary,
        duration: 8000,
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.platform.snapshots.all(),
      });
      if (businessId) {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.business.snapshotContext(businessId),
        });
      }
      setConfirmOpen(false);
      onOpenChange(false);
      setBusinessId(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const businessOptions =
    businesses?.items.map((b) => ({
      value: b.id,
      label: b.name,
    })) ?? [];

  const currentSnapshotLabel = "Default business experience";

  return (
    <>
      <AlertDialog open={open} onOpenChange={onOpenChange}>
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Apply snapshot to business</AlertDialogTitle>
            <AlertDialogDescription>
              Choose a business to receive the{" "}
              <strong>{snapshot?.name}</strong> blueprint. Only published snapshots
              can be applied.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4">
            <SearchableSelect
              items={businessOptions}
              value={businessId}
              onValueChange={setBusinessId}
              placeholder="Select business"
            />

            {businessId ? (
              <div className="rounded-md border bg-muted/30 p-3 text-sm space-y-2">
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Current experience</span>
                  <span className="font-medium">{currentSnapshotLabel}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Target blueprint</span>
                  <span className="font-medium">{snapshot?.name}</span>
                </div>
                {selectedBusiness ? (
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">Business</span>
                    <span>{selectedBusiness.name}</span>
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="flex gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
              <p>
                Applying a snapshot provisions default navigation, labels, pipelines,
                and related assets. It does not delete or overwrite existing business
                records, contacts, or deals.
              </p>
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={mutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={!businessId || mutation.isPending}
              onClick={(e) => {
                e.preventDefault();
                setConfirmOpen(true);
              }}
            >
              Review & apply
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm apply snapshot</AlertDialogTitle>
            <AlertDialogDescription>
              Apply <strong>{snapshot?.name}</strong> to{" "}
              <strong>
                {businesses?.items.find((b) => b.id === businessId)?.name}
              </strong>
              ? This action provisions blueprint defaults for that business.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={mutation.isPending}>Go back</AlertDialogCancel>
            <AlertDialogAction
              disabled={mutation.isPending}
              onClick={(e) => {
                e.preventDefault();
                mutation.mutate();
              }}
            >
              {mutation.isPending ? "Applying…" : "Confirm apply"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {lastResult ? (
        <span className="sr-only" aria-live="polite">
          {lastResult}
        </span>
      ) : null}
    </>
  );
}
