"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Tags } from "lucide-react";
import { SearchableSelect } from "@/components/forms/searchable-select";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { assignPlatformPlanTierCapabilities } from "@/features/platform/api/plan-groups.api";
import { listPlatformCapabilities } from "@/features/platform/api/capabilities.api";
import type { PlanTier } from "@/features/platform/types/plan-group";
import { queryKeys } from "@/lib/query/keys";

type AssignCapabilitiesDialogProps = {
  planGroupId: string;
  tier: PlanTier;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function AssignCapabilitiesDialog({
  planGroupId,
  tier,
  open,
  onOpenChange,
}: AssignCapabilitiesDialogProps) {
  const queryClient = useQueryClient();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [pickerKey, setPickerKey] = useState(0);

  const capabilityFilters = {
    status: "ACTIVE",
    limit: 100,
    page: 1,
  } as const;

  const { data: capabilitiesData, isLoading } = useQuery({
    queryKey: queryKeys.platform.capabilities.list(capabilityFilters),
    queryFn: () => listPlatformCapabilities(capabilityFilters),
    enabled: open,
  });

  const options = useMemo(() => {
    const assigned = new Set(
      tier.capabilities.map((c) => c.capabilityId ?? c.id),
    );
    const pending = new Set(selectedIds);
    return (capabilitiesData?.items ?? [])
      .filter((c) => !assigned.has(c.id) && !pending.has(c.id))
      .map((c) => ({ value: c.id, label: `${c.name} (${c.key})` }));
  }, [capabilitiesData, tier.capabilities, selectedIds]);

  const mutation = useMutation({
    mutationFn: () =>
      assignPlatformPlanTierCapabilities(planGroupId, tier.id, selectedIds),
    onSuccess: () => {
      toast.success("Capabilities assigned");
      void queryClient.invalidateQueries({
        queryKey: queryKeys.platform.planGroups.all(),
      });
      setSelectedIds([]);
      onOpenChange(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign capabilities</DialogTitle>
          <DialogDescription>
            Select ACTIVE capabilities to include in {tier.name}.
          </DialogDescription>
        </DialogHeader>
        <SearchableSelect
          key={pickerKey}
          items={options}
          value={null}
          onValueChange={(v) => {
            if (!v || selectedIds.includes(v)) return;
            setSelectedIds((prev) => [...prev, v]);
            setPickerKey((k) => k + 1);
          }}
          placeholder={isLoading ? "Loading…" : "Add capability"}
          disabled={isLoading}
          searchPlaceholder="Search capabilities"
          emptyMessage="No more capabilities to add"
        />
        {selectedIds.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {selectedIds.map((id) => {
              const cap = capabilitiesData?.items.find((c) => c.id === id);
              return (
                <span
                  key={id}
                  className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs"
                >
                  <Tags className="size-3" />
                  {cap?.name ?? id}
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground"
                    onClick={() =>
                      setSelectedIds((prev) => prev.filter((x) => x !== id))
                    }
                    aria-label={`Remove ${cap?.name ?? id}`}
                  >
                    ×
                  </button>
                </span>
              );
            })}
          </div>
        ) : null}
        <DialogFooter>
          <Button
            type="button"
            onClick={() => mutation.mutate()}
            disabled={selectedIds.length === 0 || mutation.isPending}
          >
            Assign selected
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
