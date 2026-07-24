"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  createPlatformAddon,
  deletePlatformAddon,
  getPlatformAddon,
  previewAddonImpact,
  syncPlatformAddonStripePrices,
  updatePlatformAddon,
  type AddonImpactPreview,
  type AddonSubscriberPolicy,
} from "@/features/platform/api/addons.api";
import { listPlatformTiers } from "@/features/platform/api/tiers.api";
import { listPlatformCapabilities } from "@/features/platform/api/capabilities.api";
import { ConfirmDeleteDialog } from "@/components/forms/confirm-delete-dialog";
import { SearchableSelect } from "@/components/forms/searchable-select";
import { AddonSubscriberImpactDialog } from "@/features/platform/components/addons/addon-subscriber-impact-dialog";

export function PlatformAddonDetailPage({ isNew = false }: { isNew?: boolean }) {
  const params = useParams<{ id: string }>();
  const id = isNew ? undefined : params.id;
  const router = useRouter();
  const qc = useQueryClient();
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [impactOpen, setImpactOpen] = useState(false);
  const [impactPreview, setImpactPreview] = useState<AddonImpactPreview | null>(
    null,
  );

  const { data: addon } = useQuery({
    queryKey: ["platform", "addons", id],
    queryFn: () => getPlatformAddon(id!),
    enabled: !!id,
  });

  const { data: tiers } = useQuery({
    queryKey: ["platform", "tiers", "picker"],
    queryFn: () => listPlatformTiers({ limit: 100 }),
  });

  const { data: capabilities, isError: capabilitiesError } = useQuery({
    queryKey: ["platform", "capabilities", "picker"],
    queryFn: () => listPlatformCapabilities({ limit: 100 }),
  });

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [purchaseMode, setPurchaseMode] = useState<"INDEPENDENT" | "DEPENDENT">(
    "INDEPENDENT",
  );
  const [status, setStatus] = useState("DRAFT");
  const [priceMonthly, setPriceMonthly] = useState("");
  const [priceYearly, setPriceYearly] = useState("");
  const [capabilityId, setCapabilityId] = useState("");
  const [tierIds, setTierIds] = useState<string[]>([]);
  const [includeInTierIds, setIncludeInTierIds] = useState<string[]>([]);

  useEffect(() => {
    if (!addon) return;
    setName(addon.name);
    setDescription(addon.description ?? "");
    setPurchaseMode(addon.purchaseMode);
    setStatus(addon.status);
    setPriceMonthly(addon.priceMonthly ?? "");
    setPriceYearly(addon.priceYearly ?? "");
    setCapabilityId(addon.capability.id);
    setTierIds(addon.tierLinks.map((t) => t.tierId));
    setIncludeInTierIds(addon.includedInTiers.map((t) => t.tierId));
  }, [addon]);

  const saveBody = useMemo(() => {
    const body: Record<string, unknown> = {
      name,
      description: description || undefined,
      purchaseMode,
      status,
      capabilityId,
    };
    if (purchaseMode === "INDEPENDENT") {
      body.priceMonthly = Number(priceMonthly);
      if (priceYearly) body.priceYearly = Number(priceYearly);
      body.includeInTierIds = includeInTierIds;
      if (!isNew) body.tierIds = [];
    } else {
      body.tierIds = tierIds;
      if (!isNew) body.includeInTierIds = [];
    }
    return body;
  }, [
    name,
    description,
    purchaseMode,
    status,
    capabilityId,
    priceMonthly,
    priceYearly,
    includeInTierIds,
    tierIds,
    isNew,
  ]);

  const save = useMutation({
    mutationFn: async (extra?: {
      subscriberPolicy?: AddonSubscriberPolicy;
      notifyOwners?: boolean;
      notifyEffectiveDate?: string;
      notifyMessage?: string;
    }) => {
      const body = { ...saveBody, ...extra };
      if (isNew) return createPlatformAddon(body);
      return updatePlatformAddon(id!, body);
    },
    onSuccess: (saved) => {
      toast.success(isNew ? "Add-on created" : "Add-on saved");
      if (saved && "stripeSync" in saved && saved.stripeSync?.synced) {
        toast.success("Stripe Price linkage updated");
      }
      void qc.invalidateQueries({ queryKey: ["platform", "addons"] });
      void qc.invalidateQueries({ queryKey: ["platform", "businesses"] });
      setImpactOpen(false);
      setImpactPreview(null);
      if (isNew) router.replace(`/platform/addons/${saved.id}`);
    },
    onError: (err: Error) => toast.error(err.message || "Save failed"),
  });

  const syncStripe = useMutation({
    mutationFn: () => syncPlatformAddonStripePrices(id!),
    onSuccess: (saved) => {
      if (saved.stripeSync?.synced) {
        toast.success("Stripe Prices created — display $ mirrors unit_amount");
      } else {
        toast.error(
          saved.stripeSync?.warnings?.[0] ??
            "Stripe Price linkage failed — retry after fixing config",
        );
      }
      void qc.invalidateQueries({ queryKey: ["platform", "addons", id] });
    },
    onError: (err: Error) =>
      toast.error(err.message || "Retry Price create failed"),
  });

  const previewThenSave = useMutation({
    mutationFn: async () => {
      if (isNew) {
        await save.mutateAsync({});
        return null;
      }
      return previewAddonImpact(id!, {
        purchaseMode,
        tierIds: purchaseMode === "DEPENDENT" ? tierIds : [],
        includeInTierIds:
          purchaseMode === "INDEPENDENT" ? includeInTierIds : [],
        priceMonthly: priceMonthly ? Number(priceMonthly) : undefined,
      });
    },
    onSuccess: (preview) => {
      if (!preview) return;
      if (preview.affectedCount > 0) {
        setImpactPreview(preview);
        setImpactOpen(true);
        return;
      }
      save.mutate({});
    },
    onError: (err: Error) => toast.error(err.message || "Preview failed"),
  });

  const archive = useMutation({
    mutationFn: () => deletePlatformAddon(id!),
    onSuccess: () => {
      toast.success("Add-on archived");
      void qc.invalidateQueries({ queryKey: ["platform", "addons"] });
      router.push("/platform/addons");
    },
    onError: (err: Error) => toast.error(err.message || "Archive failed"),
  });

  const capabilityItems = [
    ...(addon?.capability
      ? [
          {
            value: addon.capability.id,
            label: addon.capability.name,
          },
        ]
      : []),
    ...(capabilities?.items ?? [])
      .filter((cap) => cap.id !== addon?.capability?.id)
      .map((cap) => ({ value: cap.id, label: cap.name })),
  ];

  function toggleTier(list: string[], value: string, set: (v: string[]) => void) {
    set(list.includes(value) ? list.filter((x) => x !== value) : [...list, value]);
  }

  const convertAvailable =
    purchaseMode === "INDEPENDENT" && Boolean(priceMonthly);

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">
          {isNew ? "New add-on" : addon?.name ?? "Add-on"}
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Basics</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {!isNew && addon?.key ? (
            <div className="space-y-2 sm:col-span-2">
              <Label>Key</Label>
              <Input value={addon.key} disabled />
              <p className="text-xs text-muted-foreground">
                Internal identifier (auto-generated). Not shown to customers.
              </p>
            </div>
          ) : null}
          <div className="space-y-2 sm:col-span-2">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Purchase mode</Label>
            <Select
              value={purchaseMode}
              onValueChange={(v) => {
                const next = v as "INDEPENDENT" | "DEPENDENT";
                setPurchaseMode(next);
                if (next === "INDEPENDENT") setTierIds([]);
                else setIncludeInTierIds([]);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="INDEPENDENT">Independent</SelectItem>
                <SelectItem value="DEPENDENT">Dependent</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="PUBLISHED">Published</SelectItem>
                <SelectItem value="ARCHIVED">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Capability bundle</Label>
            <SearchableSelect
              items={capabilityItems}
              value={capabilityId || null}
              onValueChange={(value) => setCapabilityId(value ?? "")}
              placeholder="Select capability"
            />
            {capabilitiesError ? (
              <p className="text-xs text-destructive">
                Failed to load capabilities. Refresh and try again.
              </p>
            ) : null}
          </div>

          {purchaseMode === "INDEPENDENT" && (
            <>
              <div className="space-y-2">
                <Label>Monthly price</Label>
                <Input
                  type="number"
                  value={priceMonthly}
                  onChange={(e) => setPriceMonthly(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Yearly price</Label>
                <Input
                  type="number"
                  value={priceYearly}
                  onChange={(e) => setPriceYearly(e.target.value)}
                />
              </div>
              {!isNew ? (
                <div className="sm:col-span-2 flex items-center justify-between gap-3 rounded border p-3">
                  <div>
                    <p className="text-sm font-medium">Stripe Price linkage</p>
                    <p className="text-xs text-muted-foreground">
                      Save creates Stripe Prices first; use retry if linkage
                      failed.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={syncStripe.isPending}
                    onClick={() => syncStripe.mutate()}
                  >
                    {syncStripe.isPending ? "Retrying…" : "Retry Price create"}
                  </Button>
                </div>
              ) : null}
              <div className="space-y-2 sm:col-span-2">
                <Label>Also include in tiers (optional)</Label>
                <div className="max-h-40 space-y-2 overflow-y-auto rounded border p-3">
                  {(tiers?.items ?? []).map((tier) => (
                    <label
                      key={tier.id}
                      className="flex items-center gap-2 text-sm"
                    >
                      <Checkbox
                        checked={includeInTierIds.includes(tier.id)}
                        onCheckedChange={() =>
                          toggleTier(
                            includeInTierIds,
                            tier.id,
                            setIncludeInTierIds,
                          )
                        }
                      />
                      {tier.name}
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}

          {purchaseMode === "DEPENDENT" && (
            <div className="space-y-2 sm:col-span-2">
              <Label>Tiers (required — at least one)</Label>
              <div className="max-h-48 space-y-2 overflow-y-auto rounded border p-3">
                {(tiers?.items ?? []).map((tier) => (
                  <label
                    key={tier.id}
                    className="flex items-center gap-2 text-sm"
                  >
                    <Checkbox
                      checked={tierIds.includes(tier.id)}
                      onCheckedChange={() =>
                        toggleTier(tierIds, tier.id, setTierIds)
                      }
                    />
                    {tier.name}
                  </label>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {!isNew ? (
        <p className="text-sm text-muted-foreground">
          Removals open a campaign in{" "}
          <Link
            href="/platform/operations"
            className="font-medium text-foreground underline"
          >
            Operations
          </Link>
          .
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button
          onClick={() => previewThenSave.mutate()}
          disabled={
            previewThenSave.isPending ||
            save.isPending ||
            !name ||
            !capabilityId ||
            (purchaseMode === "DEPENDENT" && tierIds.length === 0) ||
            (purchaseMode === "INDEPENDENT" && !priceMonthly)
          }
        >
          {previewThenSave.isPending || save.isPending ? "Saving…" : "Save"}
        </Button>
        <Button
          variant="outline"
          onClick={() => router.push("/platform/addons")}
        >
          Back
        </Button>
        {!isNew ? (
          <Button
            variant="destructive"
            className="ml-auto"
            onClick={() => setArchiveOpen(true)}
          >
            Archive add-on
          </Button>
        ) : null}
      </div>

      <ConfirmDeleteDialog
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
        title="Archive this add-on?"
        description="The add-on will be hidden from new purchases. Businesses that already have it keep access until their entitlement changes."
        confirmLabel="Archive"
        pendingLabel="Archiving…"
        isPending={archive.isPending}
        onConfirm={() => archive.mutate()}
      />

      <AddonSubscriberImpactDialog
        open={impactOpen}
        onOpenChange={setImpactOpen}
        preview={impactPreview}
        convertAvailable={convertAvailable}
        isPending={save.isPending}
        confirmLabel="Save with this policy"
        onConfirm={(input) =>
          save.mutate({
            subscriberPolicy: input.policy,
            notifyOwners: input.notifyOwners,
            notifyEffectiveDate: input.notifyEffectiveDate,
            notifyMessage: input.notifyMessage,
          })
        }
      />
    </div>
  );
}
