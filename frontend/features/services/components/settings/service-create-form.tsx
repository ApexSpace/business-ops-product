"use client";

import { useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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
import { DrawerSegmentedTabs } from "@/components/drawer/drawer-segmented-tabs";
import { SETTINGS_CONTENT_SHELL_CLASS, SETTINGS_FORM_DESCRIPTION_CLASS } from "@/lib/design/settings-form-tokens";
import { DRAWER_SWITCH_CLASS } from "@/lib/design/drawer-tokens";
import { cn } from "@/lib/utils";

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
  const [processingDurationMinutes, setProcessingDurationMinutes] =
    useState("30");
  const [finishDurationMinutes, setFinishDurationMinutes] = useState("");
  const [hasBufferTime, setHasBufferTime] = useState(false);
  const [bufferBeforeMinutes, setBufferBeforeMinutes] = useState("0");
  const [bufferAfterMinutes, setBufferAfterMinutes] = useState("15");
  const [usesProducts, setUsesProducts] = useState(false);
  const [requiresNoStaff, setRequiresNoStaff] = useState(false);
  const [requiresTwoStaff, setRequiresTwoStaff] = useState(false);
  const [hasCommissionDeduction, setHasCommissionDeduction] = useState(false);
  const [commissionDeductionType, setCommissionDeductionType] = useState<
    "FLAT" | "PERCENT"
  >("PERCENT");
  const [commissionDeductionValue, setCommissionDeductionValue] = useState("");
  const [postCommissionDeductionType, setPostCommissionDeductionType] =
    useState<"FLAT" | "PERCENT">("PERCENT");
  const [postCommissionDeductionValue, setPostCommissionDeductionValue] =
    useState("");

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
      postCommissionDeductionType: hasCommissionDeduction
        ? postCommissionDeductionType
        : undefined,
      postCommissionDeductionValue:
        hasCommissionDeduction && postCommissionDeductionValue
          ? Number(postCommissionDeductionValue)
          : undefined,
    });
  };

  return (
    <div className={cn(SETTINGS_CONTENT_SHELL_CLASS, "mx-auto max-w-lg")}>
      <p className="text-sm text-muted-foreground">{categoryName}</p>
      <h2 className="text-xl font-semibold">New service</h2>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="service-name">Service name</Label>
          <Input
            id="service-name"
            placeholder="Enter service name"
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
            placeholder="Enter price"
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
              <SelectValue placeholder="Select duration" />
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

        <CreateToggle
          id="create-processing"
          label="Has processing time"
          description="Add time during the service when the client is unattended and the provider is available for other appointments."
          checked={hasProcessingTime}
          onCheckedChange={setHasProcessingTime}
        />
        {hasProcessingTime ? (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Processing Time</Label>
              <Input
                type="number"
                min={1}
                value={processingDurationMinutes}
                onChange={(e) => setProcessingDurationMinutes(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Finishing Time</Label>
              <Input
                type="number"
                min={0}
                value={finishDurationMinutes}
                onChange={(e) => setFinishDurationMinutes(e.target.value)}
              />
            </div>
          </div>
        ) : null}

        <CreateToggle
          id="create-buffer"
          label="Has buffer time"
          description="Block time before or after this service for prep or cleanup."
          checked={hasBufferTime}
          onCheckedChange={setHasBufferTime}
        />
        {hasBufferTime ? (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Before Buffer Time</Label>
              <Input
                type="number"
                min={0}
                value={bufferBeforeMinutes}
                onChange={(e) => setBufferBeforeMinutes(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>After Buffer Time</Label>
              <Input
                type="number"
                min={0}
                value={bufferAfterMinutes}
                onChange={(e) => setBufferAfterMinutes(e.target.value)}
              />
            </div>
          </div>
        ) : null}

        <Accordion multiple defaultValue={[]}>
          <AccordionItem value="additional" className="border-none">
            <AccordionTrigger className="px-0 text-base font-medium text-violet-primary-normal hover:no-underline">
              Additional Options
            </AccordionTrigger>
            <AccordionContent className="space-y-3 pb-0">
              <CreateToggle
                id="create-products"
                label="This service uses products"
                description="Add products used during this service to track stock levels automatically."
                checked={usesProducts}
                onCheckedChange={setUsesProducts}
              />
              <CreateToggle
                id="create-no-staff"
                label="Requires no staff (resources only)"
                description="For services that need a resource but not a staff member."
                checked={requiresNoStaff}
                onCheckedChange={(v) => {
                  setRequiresNoStaff(v);
                  if (v) setRequiresTwoStaff(false);
                }}
              />
              <CreateToggle
                id="create-two-staff"
                label="Requires two staff members"
                description="Both providers are blocked on the calendar for this service."
                checked={requiresTwoStaff}
                onCheckedChange={(v) => {
                  setRequiresTwoStaff(v);
                  if (v) setRequiresNoStaff(false);
                }}
              />
              <CreateToggle
                id="create-commission"
                label="This service has a commission deduction"
                checked={hasCommissionDeduction}
                onCheckedChange={setHasCommissionDeduction}
              />
              {hasCommissionDeduction ? (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-sm">Pre-Commission Deduction</Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        min={0}
                        placeholder="Enter pre-commission deduction"
                        value={commissionDeductionValue}
                        onChange={(e) =>
                          setCommissionDeductionValue(e.target.value)
                        }
                        className="flex-1"
                      />
                      <DrawerSegmentedTabs
                        size="sm"
                        className="w-auto shrink-0"
                        value={commissionDeductionType}
                        options={[
                          {
                            value: "FLAT",
                            label: "$",
                            onClick: () => setCommissionDeductionType("FLAT"),
                          },
                          {
                            value: "PERCENT",
                            label: "%",
                            onClick: () =>
                              setCommissionDeductionType("PERCENT"),
                          },
                        ]}
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm">Post-Commission Deduction</Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        min={0}
                        placeholder="Enter post-commission deduction"
                        value={postCommissionDeductionValue}
                        onChange={(e) =>
                          setPostCommissionDeductionValue(e.target.value)
                        }
                        className="flex-1"
                      />
                      <DrawerSegmentedTabs
                        size="sm"
                        className="w-auto shrink-0"
                        value={postCommissionDeductionType}
                        options={[
                          {
                            value: "FLAT",
                            label: "$",
                            onClick: () =>
                              setPostCommissionDeductionType("FLAT"),
                          },
                          {
                            value: "PERCENT",
                            label: "%",
                            onClick: () =>
                              setPostCommissionDeductionType("PERCENT"),
                          },
                        ]}
                      />
                    </div>
                  </div>
                </div>
              ) : null}
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Discard
          </Button>
          <Button
            type="submit"
            variant="brand"
            disabled={isPending || !name.trim()}
          >
            Save
          </Button>
        </div>
      </form>
    </div>
  );
}

function CreateToggle({
  id,
  label,
  description,
  checked,
  onCheckedChange,
}: {
  id: string;
  label: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0 space-y-1">
        <Label htmlFor={id} className="text-sm font-medium">
          {label}
        </Label>
        {description ? (
          <p className={SETTINGS_FORM_DESCRIPTION_CLASS}>{description}</p>
        ) : null}
      </div>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        className={DRAWER_SWITCH_CLASS}
      />
    </div>
  );
}
