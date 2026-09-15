"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import type {
  AddonImpactPreview,
  AddonSubscriberPolicy,
} from "@/features/platform/api/addons.api";

const POLICY_LABELS: Record<AddonSubscriberPolicy, string> = {
  keep_grandfathered: "Keep grandfathered (recommended)",
  force_remove: "Force remove feature now",
  convert_to_purchased: "Convert to paid add-on",
};

export function AddonSubscriberImpactDialog({
  open,
  onOpenChange,
  preview,
  title = "Affected businesses",
  confirmLabel = "Apply and save",
  isPending,
  convertAvailable,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preview: AddonImpactPreview | null;
  title?: string;
  confirmLabel?: string;
  isPending?: boolean;
  convertAvailable: boolean;
  onConfirm: (input: {
    policy: AddonSubscriberPolicy;
    notifyOwners: boolean;
    notifyEffectiveDate?: string;
    notifyMessage?: string;
  }) => void;
}) {
  const [policy, setPolicy] =
    useState<AddonSubscriberPolicy>("keep_grandfathered");
  const [notifyOwners, setNotifyOwners] = useState(false);
  const [notifyEffectiveDate, setNotifyEffectiveDate] = useState("");
  const [notifyMessage, setNotifyMessage] = useState("");

  if (!preview) return null;

  const effectivePolicy =
    policy === "convert_to_purchased" && !convertAvailable
      ? "keep_grandfathered"
      : policy;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <p>
              <strong>{preview.affectedCount}</strong> business
              {preview.affectedCount === 1 ? "" : "es"} currently have{" "}
              <strong>{preview.addonName}</strong> included, but will no longer
              get it from the catalog after this change.
            </p>
          </div>

          {preview.businesses.length > 0 ? (
            <div className="max-h-40 space-y-1 overflow-y-auto rounded border p-3 text-sm">
              {preview.businesses.map((b) => (
                <div
                  key={b.businessId}
                  className="flex items-center justify-between gap-2"
                >
                  <span className="font-medium">{b.businessName}</span>
                  <span className="text-xs text-muted-foreground">
                    {b.tierName ?? "No tier"}
                  </span>
                </div>
              ))}
              {preview.affectedCount > preview.businesses.length ? (
                <p className="pt-1 text-xs text-muted-foreground">
                  +{preview.affectedCount - preview.businesses.length} more
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="space-y-3">
            <Label>What should happen to these businesses?</Label>
            <RadioGroup
              value={effectivePolicy}
              onValueChange={(v) => setPolicy(v as AddonSubscriberPolicy)}
              className="space-y-2"
            >
              {(
                Object.keys(POLICY_LABELS) as AddonSubscriberPolicy[]
              ).map((key) => {
                const disabled =
                  key === "convert_to_purchased" && !convertAvailable;
                return (
                  <label
                    key={key}
                    className={`flex cursor-pointer items-start gap-2 rounded-md border p-3 ${
                      effectivePolicy === key
                        ? "border-primary bg-primary/5"
                        : ""
                    } ${disabled ? "opacity-50" : ""}`}
                  >
                    <RadioGroupItem
                      value={key}
                      id={`policy-${key}`}
                      disabled={disabled}
                      className="mt-1"
                    />
                    <div>
                      <p className="text-sm font-medium">
                        {POLICY_LABELS[key]}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {preview.policies[key]}
                        {disabled
                          ? " (Set Independent + monthly price first.)"
                          : ""}
                      </p>
                    </div>
                  </label>
                );
              })}
            </RadioGroup>
          </div>

          <div className="space-y-3 rounded-md border p-3">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={notifyOwners}
                onCheckedChange={(v) => setNotifyOwners(v === true)}
              />
              Email affected business owners
            </label>
            {notifyOwners ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1 sm:col-span-2">
                  <Label>Optional note</Label>
                  <Textarea
                    value={notifyMessage}
                    onChange={(e) => setNotifyMessage(e.target.value)}
                    placeholder="Explain what is changing and what they should do."
                  />
                </div>
                <div className="space-y-1">
                  <Label>Effective date (optional)</Label>
                  <Input
                    type="date"
                    value={notifyEffectiveDate}
                    onChange={(e) => setNotifyEffectiveDate(e.target.value)}
                  />
                </div>
              </div>
            ) : null}
          </div>
        </DialogBody>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={isPending}
            onClick={() =>
              onConfirm({
                policy: effectivePolicy,
                notifyOwners,
                notifyEffectiveDate: notifyEffectiveDate || undefined,
                notifyMessage: notifyMessage.trim() || undefined,
              })
            }
          >
            {isPending ? "Working…" : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
