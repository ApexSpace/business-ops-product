"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { SelectField } from "@/components/forms/select-field";
import { TextField } from "@/components/forms/text-field";
import { Skeleton } from "@/components/ui/skeleton";
import { currencySelectOptions } from "@/features/payments/utils/currencies";
import { Form, FormSchemaProvider } from "@/components/ui/form";
import { StatsCard } from "@/components/layout/stats-card";
import { listPlatformSnapshots } from "@/features/platform/api/snapshots.api";
import type { PlanGroupDetail } from "@/features/platform/types/plan-group";
import {
  planGroupOverviewSchema,
  type PlanGroupOverviewValues,
} from "@/features/platform/schemas/plan-group-form";
import { queryKeys } from "@/lib/query/keys";
import { Layers, ListChecks, Sparkles } from "lucide-react";

export const PLAN_GROUP_OVERVIEW_FORM_ID = "plan-group-overview-form";

type PlanGroupOverviewTabProps = {
  planGroup: PlanGroupDetail;
  tierCount: number;
  capabilityCount: number;
  featureCount: number;
  canManage: boolean;
  onSave: (values: PlanGroupOverviewValues) => void;
};

export function PlanGroupOverviewTab({
  planGroup,
  tierCount,
  capabilityCount,
  featureCount,
  canManage,
  onSave,
}: PlanGroupOverviewTabProps) {
  const snapshotListFilters = { page: 1, limit: 100 } as const;

  const {
    data: snapshots,
    isLoading: snapshotsLoading,
    isError: snapshotsError,
  } = useQuery({
    queryKey: queryKeys.platform.snapshots.list(snapshotListFilters),
    queryFn: () => listPlatformSnapshots(snapshotListFilters),
  });

  const snapshotOptions =
    snapshots?.items.map((snapshot) => ({
      value: snapshot.id,
      label:
        snapshot.status === "PUBLISHED"
          ? snapshot.name
          : `${snapshot.name} (${snapshot.status})`,
    })) ?? [];

  const form = useForm<PlanGroupOverviewValues>({
    resolver: zodResolver(planGroupOverviewSchema),
    defaultValues: {
      name: planGroup.name,
      description: planGroup.description ?? "",
      currency: planGroup.currency,
      billingCycles: planGroup.billingCycles,
      snapshotId: planGroup.snapshotId ?? "",
    },
  });

  useEffect(() => {
    form.reset({
      name: planGroup.name,
      description: planGroup.description ?? "",
      currency: planGroup.currency,
      billingCycles: planGroup.billingCycles,
      snapshotId: planGroup.snapshotId ?? "",
    });
  }, [planGroup, form]);

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatsCard label="Tiers" value={tierCount} icon={Layers} />
        <StatsCard
          label="Capabilities"
          value={capabilityCount}
          icon={ListChecks}
        />
        <StatsCard label="Tier features" value={featureCount} icon={Sparkles} />
      </div>

      <Form {...form}>
        <FormSchemaProvider schema={planGroupOverviewSchema}>
          <form
            id={PLAN_GROUP_OVERVIEW_FORM_ID}
            className="grid max-w-2xl gap-4"
            onSubmit={form.handleSubmit(onSave)}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                control={form.control}
                name="name"
                label="Name"
                disabled={!canManage}
              />
              <SelectField
                control={form.control}
                name="currency"
                label="Currency"
                items={currencySelectOptions}
                placeholder="Select currency"
                searchable={false}
                disabled={!canManage}
              />
            </div>
            <TextField
              control={form.control}
              name="description"
              label="Description"
              multiline
              rows={3}
              disabled={!canManage}
            />
            {snapshotsLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <SelectField
                control={form.control}
                name="snapshotId"
                label="Snapshot (optional)"
                items={[
                  { value: null, label: "No snapshot selected" },
                  ...snapshotOptions,
                ]}
                placeholder={
                  snapshotsError
                    ? "Failed to load snapshots"
                    : snapshotOptions.length === 0
                      ? "No snapshots available"
                      : "No snapshot selected"
                }
                disabled={!canManage || snapshotsError}
              />
            )}
          </form>
        </FormSchemaProvider>
      </Form>
    </div>
  );
}
