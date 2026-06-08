"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { TextField } from "@/components/forms/text-field";
import { Button } from "@/components/ui/button";
import { SearchableSelect } from "@/components/forms/searchable-select";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import { cn } from "@/lib/utils";
import {
  createPlatformSnapshot,
  getPlatformSnapshot,
  listPlatformSnapshots,
} from "@/features/platform/api/snapshots.api";
import {
  createSnapshotApiBody,
  snapshotOverviewSchema,
  type SnapshotOverviewValues,
} from "@/features/platform/schemas/snapshot-form";
import {
  DASHBOARD_PRESET_OPTIONS,
  NAVIGATION_PRESET_OPTIONS,
  TERMINOLOGY_PRESET_OPTIONS,
  buildAssetsFromWizardPresets,
  getDefaultStartingAssets,
  type DashboardPresetId,
  type NavigationPresetId,
  type TerminologyPresetId,
} from "@/features/platform/utils/snapshot-presets";
import { queryKeys } from "@/lib/query/keys";
import type { SnapshotAssets } from "@/features/platform/types/snapshot";

type StartingPoint = "blank" | "default" | "clone";

const STEPS = [
  { id: 1, title: "Basics", description: "Name and describe your blueprint" },
  { id: 2, title: "Starting point", description: "Blank, default, or clone" },
  { id: 3, title: "Experience", description: "Labels, menu, and dashboard" },
  { id: 4, title: "Review", description: "Confirm and create" },
] as const;

const STARTING_OPTIONS: { value: StartingPoint; label: string; description: string }[] =
  [
    {
      value: "blank",
      label: "Blank blueprint",
      description: "Minimal defaults—configure everything in the editor.",
    },
    {
      value: "default",
      label: "Default business snapshot",
      description: "Standard navigation and dashboard for most businesses.",
    },
    {
      value: "clone",
      label: "Clone existing snapshot",
      description: "Copy assets from another blueprint.",
    },
  ];

const overviewDefaults: SnapshotOverviewValues = {
  name: "",
  description: "",
};

export function CreateSnapshotWizard() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [startingPoint, setStartingPoint] = useState<StartingPoint>("default");
  const [cloneSourceId, setCloneSourceId] = useState<string | null>(null);
  const [terminologyPreset, setTerminologyPreset] =
    useState<TerminologyPresetId>("default");
  const [navigationPreset, setNavigationPreset] =
    useState<NavigationPresetId>("full");
  const [dashboardPreset, setDashboardPreset] =
    useState<DashboardPresetId>("default");
  const [cloneAssets, setCloneAssets] = useState<SnapshotAssets | null>(null);

  const router = useRouter();
  const queryClient = useQueryClient();
  const form = useForm<SnapshotOverviewValues>({
    resolver: zodResolver(snapshotOverviewSchema),
    defaultValues: overviewDefaults,
  });

  const { data: snapshotList } = useQuery({
    queryKey: queryKeys.platform.snapshots.list({ page: 1, limit: 100 }),
    queryFn: () => listPlatformSnapshots({ page: 1, limit: 100 }),
    enabled: open && startingPoint === "clone",
  });

  const cloneOptions =
    snapshotList?.items.map((item) => ({
      value: item.id,
      label: item.name,
    })) ?? [];

  const resetWizard = () => {
    setStep(1);
    setStartingPoint("default");
    setCloneSourceId(null);
    setCloneAssets(null);
    setTerminologyPreset("default");
    setNavigationPreset("full");
    setDashboardPreset("default");
    form.reset(overviewDefaults);
  };

  const loadCloneAssets = async (id: string) => {
    try {
      const snapshot = await getPlatformSnapshot(id);
      setCloneAssets(snapshot.assets);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load snapshot");
    }
  };

  const startingAssets = useMemo(() => {
    if (startingPoint === "clone" && cloneAssets) return cloneAssets;
    return getDefaultStartingAssets(startingPoint === "blank" ? "blank" : "default");
  }, [startingPoint, cloneAssets]);

  const previewAssets = useMemo(
    () =>
      buildAssetsFromWizardPresets({
        startingAssets,
        terminologyPreset,
        navigationPreset,
        dashboardPreset,
      }),
    [startingAssets, terminologyPreset, navigationPreset, dashboardPreset],
  );

  const mutation = useMutation({
    mutationFn: (values: SnapshotOverviewValues) =>
      createPlatformSnapshot(
        createSnapshotApiBody({
          ...values,
          assets: previewAssets,
        }),
      ),
    onSuccess: (snapshot) => {
      toast.success("Snapshot created");
      void queryClient.invalidateQueries({
        queryKey: queryKeys.platform.snapshots.all(),
      });
      setOpen(false);
      resetWizard();
      router.push(`/platform/snapshots/${snapshot.id}`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const canGoNext = () => {
    if (step === 1) return !!form.watch("name")?.trim();
    if (step === 2 && startingPoint === "clone") return !!cloneSourceId && !!cloneAssets;
    return true;
  };

  const handleNext = async () => {
    if (step === 1) {
      const valid = await form.trigger();
      if (!valid) return;
    }
    if (step === 2 && startingPoint === "clone" && !cloneAssets && cloneSourceId) {
      await loadCloneAssets(cloneSourceId);
    }
    setStep((s) => Math.min(4, s + 1));
  };

  const handleCreate = form.handleSubmit((values) => mutation.mutate(values));

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        <Plus className="mr-2 size-4" />
        New snapshot
      </Button>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) resetWizard();
        }}
      >
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle>Create business blueprint</DialogTitle>
            <p className="text-sm text-muted-foreground">
              {STEPS[step - 1]?.description}
            </p>
          </DialogHeader>
          <Form {...form}>
            <DialogBody className="space-y-4">
              <div className="flex gap-2">
                {STEPS.map((s) => (
                  <div
                    key={s.id}
                    className={cn(
                      "h-1 flex-1 rounded-full",
                      s.id <= step ? "bg-primary" : "bg-muted",
                    )}
                  />
                ))}
              </div>
              <p className="text-sm font-medium">
                Step {step} of 4 · {STEPS[step - 1]?.title}
              </p>

              {step === 1 ? (
                <>
                  <TextField
                    control={form.control}
                    name="name"
                    label="Snapshot name"
                    placeholder="Dental Practice"
                  />
                  <TextField
                    control={form.control}
                    name="description"
                    label="Description"
                    placeholder="Who is this blueprint for?"
                    multiline
                  />
                </>
              ) : null}

              {step === 2 ? (
                <div className="space-y-4">
                  <OptionCards
                    options={STARTING_OPTIONS}
                    value={startingPoint}
                    onChange={(v) => {
                      setStartingPoint(v as StartingPoint);
                      setCloneSourceId(null);
                      setCloneAssets(null);
                    }}
                  />
                  {startingPoint === "clone" ? (
                    <SearchableSelect
                      items={cloneOptions}
                      value={cloneSourceId}
                      onValueChange={(id) => {
                        setCloneSourceId(id);
                        if (id) void loadCloneAssets(id);
                      }}
                      placeholder="Select snapshot to clone"
                    />
                  ) : null}
                </div>
              ) : null}

              {step === 3 ? (
                <div className="space-y-4">
                  <OptionCards
                    label="Terminology set"
                    options={TERMINOLOGY_PRESET_OPTIONS}
                    value={terminologyPreset}
                    onChange={(v) => setTerminologyPreset(v as TerminologyPresetId)}
                  />
                  <OptionCards
                    label="Navigation set"
                    options={NAVIGATION_PRESET_OPTIONS}
                    value={navigationPreset}
                    onChange={(v) => setNavigationPreset(v as NavigationPresetId)}
                  />
                  <OptionCards
                    label="Dashboard preset"
                    options={DASHBOARD_PRESET_OPTIONS}
                    value={dashboardPreset}
                    onChange={(v) => setDashboardPreset(v as DashboardPresetId)}
                  />
                </div>
              ) : null}

              {step === 4 ? (
                <Card>
                  <CardContent className="space-y-3 pt-6 text-sm">
                    <SummaryRow label="Name" value={form.watch("name")} />
                    <SummaryRow
                      label="Description"
                      value={form.watch("description") || "—"}
                    />
                    <SummaryRow
                      label="Starting point"
                      value={
                        STARTING_OPTIONS.find((o) => o.value === startingPoint)
                          ?.label ?? startingPoint
                      }
                    />
                    <SummaryRow
                      label="Terminology"
                      value={
                        TERMINOLOGY_PRESET_OPTIONS.find(
                          (o) => o.value === terminologyPreset,
                        )?.label ?? terminologyPreset
                      }
                    />
                    <SummaryRow
                      label="Navigation"
                      value={
                        NAVIGATION_PRESET_OPTIONS.find(
                          (o) => o.value === navigationPreset,
                        )?.label ?? navigationPreset
                      }
                    />
                    <SummaryRow
                      label="Dashboard"
                      value={
                        DASHBOARD_PRESET_OPTIONS.find(
                          (o) => o.value === dashboardPreset,
                        )?.label ?? dashboardPreset
                      }
                    />
                    <SummaryRow
                      label="Menu items"
                      value={String(previewAssets.navigation.length)}
                    />
                    <SummaryRow
                      label="Dashboard widgets"
                      value={String(previewAssets.dashboard.widgets.length)}
                    />
                  </CardContent>
                </Card>
              ) : null}
            </DialogBody>
            <DialogFooter className="gap-2 sm:justify-between">
              <Button
                type="button"
                variant="outline"
                disabled={step === 1 || mutation.isPending}
                onClick={() => setStep((s) => Math.max(1, s - 1))}
              >
                <ChevronLeft className="mr-1 size-4" />
                Back
              </Button>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                  disabled={mutation.isPending}
                >
                  Cancel
                </Button>
                {step < 4 ? (
                  <Button
                    type="button"
                    disabled={!canGoNext() || mutation.isPending}
                    onClick={() => void handleNext()}
                  >
                    Next
                    <ChevronRight className="ml-1 size-4" />
                  </Button>
                ) : (
                  <Button
                    type="button"
                    disabled={mutation.isPending}
                    onClick={() => void handleCreate()}
                  >
                    {mutation.isPending ? "Creating…" : "Create & open editor"}
                  </Button>
                )}
              </div>
            </DialogFooter>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}

function OptionCards({
  label,
  options,
  value,
  onChange,
}: {
  label?: string;
  options: { value: string; label: string; description: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      {label ? <p className="text-sm font-medium">{label}</p> : null}
      <div className="space-y-2">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              "w-full rounded-md border p-3 text-left transition-colors",
              value === option.value
                ? "border-primary bg-primary/5"
                : "hover:bg-muted/50",
            )}
          >
            <p className="font-medium">{option.label}</p>
            <p className="text-sm text-muted-foreground">{option.description}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b pb-2 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
