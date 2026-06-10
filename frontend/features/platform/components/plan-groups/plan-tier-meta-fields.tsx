"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Tags } from "lucide-react";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/forms/searchable-select";
import { listPlatformCapabilities } from "@/features/platform/api/capabilities.api";
import type { TierCapability } from "@/features/platform/types/plan-group";
import { queryKeys } from "@/lib/query/keys";
import { resolveTierCapabilityId } from "./plan-tier-form.utils";

type CapabilityOption = {
  id: string;
  name: string;
  key: string;
};

type AssignedCapability = TierCapability | CapabilityOption;

type PlanTierCapabilityFieldProps = {
  assigned: AssignedCapability[];
  onAssign: (capabilityId: string) => void;
  onRemove: (capabilityId: string) => void;
  disabled?: boolean;
  isRemoving?: boolean;
  snapshotId?: string | null;
};

const ACTIVE_CAPABILITY_FILTERS = {
  status: "ACTIVE",
  limit: 100,
  page: 1,
} as const;

export function PlanTierCapabilityField({
  assigned,
  onAssign,
  onRemove,
  disabled,
  isRemoving,
}: PlanTierCapabilityFieldProps) {
  const [pickerKey, setPickerKey] = useState(0);
  const [stagedIds, setStagedIds] = useState<string[]>([]);

  const {
    data: capabilitiesData,
    isLoading,
    isError,
  } = useQuery({
    queryKey: queryKeys.platform.capabilities.list(ACTIVE_CAPABILITY_FILTERS),
    queryFn: () => listPlatformCapabilities(ACTIVE_CAPABILITY_FILTERS),
  });

  const confirmedIds = useMemo(
    () => new Set(assigned.map(resolveTierCapabilityId).filter(Boolean)),
    [assigned],
  );

  const pendingIds = useMemo(
    () => stagedIds.filter((id) => !confirmedIds.has(id)),
    [stagedIds, confirmedIds],
  );

  const assignedIds = useMemo(
    () => new Set([...confirmedIds, ...pendingIds]),
    [confirmedIds, pendingIds],
  );

  const options = useMemo(
    () =>
      (capabilitiesData?.items ?? [])
        .filter((cap) => !assignedIds.has(cap.id))
        .map((cap) => ({
          value: cap.id,
          label: `${cap.name} (${cap.key})`,
        })),
    [capabilitiesData, assignedIds],
  );

  const displayChips = useMemo(() => {
    const chips = assigned.map((cap) => {
      const id = resolveTierCapabilityId(cap);
      const match = capabilitiesData?.items.find((item) => item.id === id);
      return {
        id,
        name: cap.name?.trim() || match?.name || "Capability",
      };
    });

    for (const id of pendingIds) {
      if (chips.some((chip) => chip.id === id)) continue;
      const match = capabilitiesData?.items.find((cap) => cap.id === id);
      if (match) {
        chips.push({ id: match.id, name: match.name });
      }
    }

    return chips.filter((chip) => chip.id);
  }, [assigned, pendingIds, capabilitiesData]);

  const catalogCount = capabilitiesData?.items.length ?? 0;

  const allCapabilitiesAssigned =
    !isLoading &&
    !isError &&
    catalogCount > 0 &&
    options.length === 0;

  const placeholder = isLoading
    ? "Loading capabilities…"
    : isError
      ? "Failed to load capabilities"
      : catalogCount === 0
        ? "No active capabilities"
        : allCapabilitiesAssigned
          ? "All capabilities assigned"
          : "Add capability";

  const handleAssign = (capabilityId: string | null) => {
    if (!capabilityId || assignedIds.has(capabilityId)) return;
    setStagedIds((prev) => [...prev, capabilityId]);
    onAssign(capabilityId);
    setPickerKey((k) => k + 1);
  };

  return (
    <div className="space-y-2">
      <Label>Capabilities</Label>
      <SearchableSelect
        key={pickerKey}
        items={options}
        value={null}
        onValueChange={handleAssign}
        placeholder={placeholder}
        disabled={disabled || isLoading || isError || catalogCount === 0}
        searchPlaceholder="Search capabilities"
        emptyMessage={
          isError
            ? "Could not load capabilities"
            : catalogCount === 0
              ? "No active capabilities available — publish capabilities on the Capabilities page"
              : allCapabilitiesAssigned
                ? "All active capabilities are assigned to this tier"
                : "No matching capabilities"
        }
      />
      {displayChips.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {displayChips.map((cap) => (
            <span
              key={cap.id}
              className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs"
            >
              <Tags className="size-3" />
              {cap.name}
              {!disabled ? (
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    setStagedIds((prev) => prev.filter((id) => id !== cap.id));
                    onRemove(cap.id);
                  }}
                  disabled={isRemoving}
                  aria-label={`Remove ${cap.name}`}
                >
                  ×
                </button>
              ) : null}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
