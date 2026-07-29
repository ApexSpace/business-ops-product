"use client";

import { useEffect, useState } from "react";
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
  createPlatformTier,
  deletePlatformTier,
  getPlatformTier,
  getPlatformTierStripeSync,
  publishPlatformTierVersion,
  syncPlatformTierStripePrices,
  updatePlatformTier,
  type TierStripeSync,
} from "@/features/platform/api/tiers.api";
import { listPlatformCapabilities } from "@/features/platform/api/capabilities.api";
import { listPlatformAddons } from "@/features/platform/api/addons.api";
import { ConfirmDeleteDialog } from "@/components/forms/confirm-delete-dialog";

function formatCents(cents: number | null | undefined) {
  if (cents == null) return "—";
  return `$${(cents / 100).toFixed(2)}`;
}

function syncStatusLabel(sync: TierStripeSync | undefined) {
  if (!sync) return "Unknown";
  if (!sync.stripeConfigured) return "Stripe not configured";
  if (sync.synced) return "Matched";
  return "Drift detected";
}

export function PlatformTierDetailPage({ isNew = false }: { isNew?: boolean }) {
  const params = useParams<{ id: string }>();
  const id = isNew ? undefined : params.id;
  const router = useRouter();
  const qc = useQueryClient();
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [lastSync, setLastSync] = useState<TierStripeSync | null>(null);

  const { data: tier } = useQuery({
    queryKey: ["platform", "tiers", id],
    queryFn: () => getPlatformTier(id!),
    enabled: !!id,
  });

  const { data: stripeSync, refetch: refetchStripeSync } = useQuery({
    queryKey: ["platform", "tiers", id, "stripe-sync"],
    queryFn: () => getPlatformTierStripeSync(id!),
    enabled: !!id,
  });

  const { data: capabilities, isError: capabilitiesError } = useQuery({
    queryKey: ["platform", "capabilities", "picker"],
    queryFn: () => listPlatformCapabilities({ limit: 100 }),
  });

  const { data: independents } = useQuery({
    queryKey: ["platform", "addons", "independent"],
    queryFn: () =>
      listPlatformAddons({ purchaseMode: "INDEPENDENT", limit: 100 }),
  });

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("DRAFT");
  const [isPublic, setIsPublic] = useState(true);
  const [priceMonthly, setPriceMonthly] = useState("");
  const [priceYearly, setPriceYearly] = useState("");
  const [staffLimit, setStaffLimit] = useState("");
  const [locationLimit, setLocationLimit] = useState("");
  const [capabilityIds, setCapabilityIds] = useState<string[]>([]);
  const [includedAddonIds, setIncludedAddonIds] = useState<string[]>([]);

  useEffect(() => {
    if (!tier) return;
    setName(tier.name);
    setDescription(tier.description ?? "");
    setStatus(tier.status);
    setIsPublic(tier.isPublic);
    setPriceMonthly(tier.priceMonthly ?? "");
    setPriceYearly(tier.priceYearly ?? "");
    setStaffLimit(tier.staffLimit?.toString() ?? "");
    setLocationLimit(tier.locationLimit?.toString() ?? "");
    setCapabilityIds(tier.capabilities.map((c) => c.id));
    setIncludedAddonIds(tier.includedAddons.map((a) => a.id));
    if (tier.stripeSync) setLastSync(tier.stripeSync);
  }, [tier]);

  const displaySync = lastSync ?? stripeSync;

  function toastStripeSync(sync: TierStripeSync | undefined) {
    if (!sync) return;
    if (!sync.stripeConfigured) {
      toast.message("Catalog saved locally — Stripe is not configured");
      return;
    }
    if (sync.warnings?.length) {
      toast.warning(sync.warnings[0]);
    }
    if (sync.synced) {
      toast.success(
        sync.createdMonthlyPrice || sync.createdYearlyPrice
          ? "Stripe Prices created — display $ mirrors unit_amount"
          : "Stripe Price linkage is up to date",
      );
    } else {
      toast.error(
        "Stripe Price linkage failed — use Retry Price create before checkout or migrate",
      );
    }
  }

  const save = useMutation({
    mutationFn: async () => {
      const body = {
        name,
        description: description || undefined,
        status,
        isPublic,
        priceMonthly: priceMonthly ? Number(priceMonthly) : undefined,
        priceYearly: priceYearly ? Number(priceYearly) : undefined,
        staffLimit: staffLimit === "" ? null : Number(staffLimit),
        locationLimit: locationLimit === "" ? null : Number(locationLimit),
        capabilityIds,
        includedAddonIds,
      };
      if (isNew) {
        return createPlatformTier(body);
      }
      return updatePlatformTier(id!, body);
    },
    onSuccess: (saved) => {
      toast.success(isNew ? "Tier created" : "Tier saved");
      if (saved.stripeSync) {
        setLastSync(saved.stripeSync);
        toastStripeSync(saved.stripeSync);
      }
      void qc.invalidateQueries({ queryKey: ["platform", "tiers"] });
      if (isNew) router.replace(`/platform/tiers/${saved.id}`);
    },
    onError: (err: Error) => toast.error(err.message || "Save failed"),
  });

  const publishVersion = useMutation({
    mutationFn: () =>
      publishPlatformTierVersion(id!, {
        mode: "new_buyers_only",
        reason: "Admin published immutable tier version",
      }),
    onSuccess: (saved) => {
      toast.success(
        "Tier published — new version recorded. Open Operations for subscriber migrations.",
      );
      if (saved.stripeSync) {
        setLastSync(saved.stripeSync);
        toastStripeSync(saved.stripeSync);
      }
      void qc.invalidateQueries({ queryKey: ["platform", "tiers"] });
    },
    onError: (err: Error) => toast.error(err.message || "Publish failed"),
  });

  const syncStripe = useMutation({
    mutationFn: () => syncPlatformTierStripePrices(id!),
    onSuccess: (saved) => {
      if (saved.stripeSync) setLastSync(saved.stripeSync);
      toastStripeSync(saved.stripeSync);
      void qc.invalidateQueries({ queryKey: ["platform", "tiers", id] });
      void refetchStripeSync();
    },
    onError: (err: Error) => toast.error(err.message || "Stripe sync failed"),
  });

  const archive = useMutation({
    mutationFn: () => deletePlatformTier(id!),
    onSuccess: () => {
      toast.success("Tier archived");
      void qc.invalidateQueries({ queryKey: ["platform", "tiers"] });
      router.push("/platform/tiers");
    },
    onError: (err: Error) => toast.error(err.message || "Archive failed"),
  });

  function toggleId(list: string[], value: string, set: (v: string[]) => void) {
    set(list.includes(value) ? list.filter((x) => x !== value) : [...list, value]);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">
          {isNew ? "New tier" : tier?.name ?? "Tier"}
        </h1>
        <p className="text-sm text-muted-foreground">
          Enter catalog $. On save we create Stripe Prices first, store price
          IDs, then mirror display $ from Stripe unit_amount. You do not paste
          Price IDs.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Basics</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
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
            <Label>Status</Label>
            <Select
              value={status}
              onValueChange={(v) => {
                if (v != null) setStatus(v);
              }}
            >
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
          <div className="flex items-center gap-2 pt-6">
            <Checkbox
              checked={isPublic}
              onCheckedChange={(v) => setIsPublic(v === true)}
              id="isPublic"
            />
            <Label htmlFor="isPublic">Public (self-serve)</Label>
          </div>
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
          <div className="space-y-2">
            <Label>Staff limit (blank = unlimited)</Label>
            <Input
              type="number"
              value={staffLimit}
              onChange={(e) => setStaffLimit(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Location limit (blank = unlimited)</Label>
            <Input
              type="number"
              value={locationLimit}
              onChange={(e) => setLocationLimit(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {!isNew ? (
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
            <div>
              <CardTitle>Stripe Price linkage</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Status: {syncStatusLabel(displaySync)}. Checkout and Ops migrate
                require active Stripe Price IDs. Retry Price create if linkage
                failed.
              </p>
            </div>
            <Button
              type="button"
              variant="secondary"
              disabled={syncStripe.isPending}
              onClick={() => syncStripe.mutate()}
            >
              {syncStripe.isPending ? "Retrying…" : "Retry Price create"}
            </Button>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <p className="text-muted-foreground">Catalog monthly</p>
              <p className="font-medium">
                {formatCents(displaySync?.catalogMonthlyCents)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Stripe monthly amount</p>
              <p className="font-medium">
                {formatCents(displaySync?.monthlyUnitAmount)}
                {displaySync?.monthlyMatched === false ? (
                  <span className="ml-2 text-destructive">mismatch</span>
                ) : null}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Catalog yearly</p>
              <p className="font-medium">
                {formatCents(displaySync?.catalogYearlyCents)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Stripe yearly amount</p>
              <p className="font-medium">
                {formatCents(displaySync?.yearlyUnitAmount)}
                {displaySync?.yearlyMatched === false ? (
                  <span className="ml-2 text-destructive">mismatch</span>
                ) : null}
              </p>
            </div>
            <div className="sm:col-span-2 space-y-1 break-all font-mono text-xs text-muted-foreground">
              <p>
                Product:{" "}
                {displaySync?.productId ?? tier?.stripe?.productId ?? "—"}
              </p>
              <p>
                Monthly Price:{" "}
                {displaySync?.monthlyPriceId ??
                  tier?.stripe?.monthlyPriceId ??
                  "—"}
              </p>
              <p>
                Yearly Price:{" "}
                {displaySync?.yearlyPriceId ??
                  tier?.stripe?.yearlyPriceId ??
                  "—"}
              </p>
            </div>
            {(displaySync?.warnings?.length ?? 0) > 0 ? (
              <ul className="sm:col-span-2 list-inside list-disc text-amber-700 dark:text-amber-400">
                {displaySync!.warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Capabilities</CardTitle>
        </CardHeader>
        <CardContent className="max-h-64 space-y-2 overflow-y-auto">
          {capabilitiesError ? (
            <p className="text-sm text-destructive">
              Failed to load capabilities. Refresh and try again.
            </p>
          ) : null}
          {(capabilities?.items ?? []).map((cap) => (
            <label key={cap.id} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={capabilityIds.includes(cap.id)}
                onCheckedChange={() =>
                  toggleId(capabilityIds, cap.id, setCapabilityIds)
                }
              />
              {cap.name}
            </label>
          ))}
          {!capabilitiesError && (capabilities?.items?.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">
              No capabilities yet. Create one under Capabilities first.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Included independent add-ons</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Bundle sellable add-ons into this tier&apos;s price (businesses on
            this tier get them free — no second charge). Create independent
            add-ons under Add-ons first, then check them here.
          </p>
          {(independents?.items ?? []).map((addon) => (
            <label key={addon.id} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={includedAddonIds.includes(addon.id)}
                onCheckedChange={() =>
                  toggleId(includedAddonIds, addon.id, setIncludedAddonIds)
                }
              />
              {addon.name}
              {addon.priceMonthly ? (
                <span className="text-xs text-muted-foreground">
                  (${addon.priceMonthly}/mo if bought separately)
                </span>
              ) : null}
            </label>
          ))}
          {(independents?.items?.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">
              No independent add-ons yet. Create one on the Add-ons page, then
              return here to include it in this tier.
            </p>
          ) : null}
          {tier && tier.dependentAddons.length > 0 && (
            <div className="pt-2 text-sm">
              <p className="font-medium">Dependent (linked from Add-ons)</p>
              <ul className="list-inside list-disc text-muted-foreground">
                {tier.dependentAddons.map((a) => (
                  <li key={a.id}>{a.name}</li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button onClick={() => save.mutate()} disabled={save.isPending || !name}>
          {save.isPending ? "Saving…" : "Save"}
        </Button>
        {!isNew ? (
          <Button
            variant="secondary"
            onClick={() => publishVersion.mutate()}
            disabled={publishVersion.isPending}
          >
            {publishVersion.isPending ? "Publishing…" : "Publish"}
          </Button>
        ) : null}
        <Button variant="outline" onClick={() => router.push("/platform/tiers")}>
          Back
        </Button>
        {!isNew ? (
          <Button
            variant="destructive"
            className="ml-auto"
            onClick={() => setArchiveOpen(true)}
          >
            Archive tier
          </Button>
        ) : null}
      </div>

      <ConfirmDeleteDialog
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
        title="Archive this tier?"
        description="The tier will be hidden from new sales. Existing businesses stay on their purchased version. You cannot archive a tier that is the only link for a dependent add-on."
        confirmLabel="Archive"
        pendingLabel="Archiving…"
        isPending={archive.isPending}
        onConfirm={() => archive.mutate()}
      />
    </div>
  );
}
