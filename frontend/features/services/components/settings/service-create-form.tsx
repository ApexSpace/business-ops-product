"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ServiceCreateFormProps = {
  categoryId: string;
  categoryName: string;
  durationPresets: number[];
  isPending: boolean;
  onCancel: () => void;
  onSubmit: (body: Record<string, unknown>) => void;
};

export function ServiceCreateForm({
  categoryId,
  categoryName,
  durationPresets,
  isPending,
  onCancel,
  onSubmit,
}: ServiceCreateFormProps) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("60");
  const [hasProcessingTime, setHasProcessingTime] = useState(false);
  const [processingDurationMinutes, setProcessingDurationMinutes] = useState("30");
  const [finishDurationMinutes, setFinishDurationMinutes] = useState("");
  const [hasBufferTime, setHasBufferTime] = useState(false);
  const [bufferBeforeMinutes, setBufferBeforeMinutes] = useState("0");
  const [bufferAfterMinutes, setBufferAfterMinutes] = useState("15");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [usesProducts, setUsesProducts] = useState(false);
  const [requiresNoStaff, setRequiresNoStaff] = useState(false);
  const [requiresTwoStaff, setRequiresTwoStaff] = useState(false);
  const [hasCommissionDeduction, setHasCommissionDeduction] = useState(false);
  const [commissionDeductionType, setCommissionDeductionType] = useState<
    "FLAT" | "PERCENT"
  >("PERCENT");
  const [commissionDeductionValue, setCommissionDeductionValue] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      categoryId,
      name: name.trim(),
      price: price ? Number(price) : undefined,
      durationMinutes: Number(durationMinutes),
      hasProcessingTime,
      processingDurationMinutes: hasProcessingTime
        ? Number(processingDurationMinutes)
        : 0,
      finishDurationMinutes:
        hasProcessingTime && finishDurationMinutes
          ? Number(finishDurationMinutes)
          : undefined,
      hasBufferTime,
      bufferBeforeMinutes: hasBufferTime ? Number(bufferBeforeMinutes) : 0,
      bufferAfterMinutes: hasBufferTime ? Number(bufferAfterMinutes) : 0,
      usesProducts,
      requiresNoStaff,
      requiresTwoStaff,
      hasCommissionDeduction,
      commissionDeductionType: hasCommissionDeduction
        ? commissionDeductionType
        : undefined,
      commissionDeductionValue:
        hasCommissionDeduction && commissionDeductionValue
          ? Number(commissionDeductionValue)
          : undefined,
    });
  };

  return (
    <div className="mx-auto max-w-lg">
      <p className="text-sm text-muted-foreground">{categoryName}</p>
      <h2 className="text-xl font-semibold">New service</h2>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="service-name">Service name</Label>
          <Input
            id="service-name"
            placeholder="e.g. Haircut"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="service-price">Price</Label>
          <Input
            id="service-price"
            type="number"
            min={0}
            step="0.01"
            placeholder="e.g. 50.00"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Duration</Label>
          <Select
            value={durationMinutes}
            onValueChange={(v) => v && setDurationMinutes(v)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {durationPresets.map((m) => (
                <SelectItem key={m} value={String(m)}>
                  {m} min
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-start justify-between gap-4 rounded-lg border p-3">
          <div>
            <p className="font-medium">Has processing time</p>
            <p className="text-xs text-muted-foreground">
              Add time when the client is unattended and the provider is
              available for other appointments.
            </p>
          </div>
          <Switch
            checked={hasProcessingTime}
            onCheckedChange={setHasProcessingTime}
          />
        </div>
        {hasProcessingTime ? (
          <div className="grid grid-cols-2 gap-3 pl-2">
            <div className="space-y-1">
              <Label>Processing (min)</Label>
              <Input
                type="number"
                min={1}
                value={processingDurationMinutes}
                onChange={(e) => setProcessingDurationMinutes(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Finish (min, optional)</Label>
              <Input
                type="number"
                min={0}
                value={finishDurationMinutes}
                onChange={(e) => setFinishDurationMinutes(e.target.value)}
              />
            </div>
          </div>
        ) : null}

        <div className="flex items-start justify-between gap-4 rounded-lg border p-3">
          <div>
            <p className="font-medium">Has buffer time</p>
            <p className="text-xs text-muted-foreground">
              Block time before or after this service for prep or cleanup.
            </p>
          </div>
          <Switch checked={hasBufferTime} onCheckedChange={setHasBufferTime} />
        </div>
        {hasBufferTime ? (
          <div className="grid grid-cols-2 gap-3 pl-2">
            <div className="space-y-1">
              <Label>Before (min)</Label>
              <Input
                type="number"
                min={0}
                value={bufferBeforeMinutes}
                onChange={(e) => setBufferBeforeMinutes(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>After (min)</Label>
              <Input
                type="number"
                min={0}
                value={bufferAfterMinutes}
                onChange={(e) => setBufferAfterMinutes(e.target.value)}
              />
            </div>
          </div>
        ) : null}

        <button
          type="button"
          className="text-sm text-primary underline"
          onClick={() => setShowAdvanced((v) => !v)}
        >
          {showAdvanced ? "Hide" : "Show"} additional options
        </button>

        {showAdvanced ? (
          <div className="space-y-3 rounded-lg border p-3">
            <AdvancedToggle
              label="This service uses products"
              description="Track products used during this service for cost and inventory (coming soon)."
              checked={usesProducts}
              onCheckedChange={setUsesProducts}
            />
            <AdvancedToggle
              label="Requires no staff (resources only)"
              description="For services that need a resource but not a staff member."
              checked={requiresNoStaff}
              onCheckedChange={(v) => {
                setRequiresNoStaff(v);
                if (v) setRequiresTwoStaff(false);
              }}
            />
            <AdvancedToggle
              label="Requires two staff members"
              description="Both providers are blocked on the calendar for this service."
              checked={requiresTwoStaff}
              onCheckedChange={(v) => {
                setRequiresTwoStaff(v);
                if (v) setRequiresNoStaff(false);
              }}
            />
            <AdvancedToggle
              label="This service has a commission deduction"
              checked={hasCommissionDeduction}
              onCheckedChange={setHasCommissionDeduction}
            />
            {hasCommissionDeduction ? (
              <div className="grid grid-cols-2 gap-2">
                <Select
                  value={commissionDeductionType}
                  onValueChange={(v) =>
                    setCommissionDeductionType(v as "FLAT" | "PERCENT")
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FLAT">Flat ($)</SelectItem>
                    <SelectItem value="PERCENT">Percent (%)</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  min={0}
                  value={commissionDeductionValue}
                  onChange={(e) => setCommissionDeductionValue(e.target.value)}
                />
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={isPending || !name.trim()}>
            Create
          </Button>
        </div>
      </form>
    </div>
  );
}

function AdvancedToggle({
  label,
  description,
  checked,
  onCheckedChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-medium">{label}</p>
        {description ? (
          <p className="text-xs text-muted-foreground">{description}</p>
        ) : null}
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}
