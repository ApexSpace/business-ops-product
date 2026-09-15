"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { OptionsFilterDrawer } from "@/components/layout/options-filter-drawer";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  DRAWER_FIELD_CLASS,
  DRAWER_FORM_FIELDS_CLASS,
  DRAWER_SELECT_TRIGGER_CLASS,
} from "@/lib/design/drawer-tokens";
import { cn } from "@/lib/utils";

export interface MembershipsOptionsValues {
  status: string;
  planId: string;
  showDifferentVersionsOnly: boolean;
  showOlderUnpaid: boolean;
}

export interface MembershipsOptionsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  values: MembershipsOptionsValues;
  plans: Array<{ id: string; name: string }>;
  onApply: (values: MembershipsOptionsValues) => void;
  onDownload?: (values: MembershipsOptionsValues) => void;
}

export function MembershipsOptionsDrawer({
  open,
  onOpenChange,
  values,
  plans,
  onApply,
  onDownload,
}: MembershipsOptionsDrawerProps) {
  const [draft, setDraft] = useState<MembershipsOptionsValues>(values);

  const handleOpenChange = (next: boolean) => {
    if (next) setDraft(values);
    onOpenChange(next);
  };

  const update = <K extends keyof MembershipsOptionsValues>(
    key: K,
    value: MembershipsOptionsValues[K],
  ) => setDraft((prev) => ({ ...prev, [key]: value }));

  return (
    <OptionsFilterDrawer
      open={open}
      onOpenChange={handleOpenChange}
      spineLabel="OPTIONS"
      onApply={() => onApply(draft)}
      leading={
        onDownload ? (
          <button
            type="button"
            onClick={() => {
              onApply(draft);
              onDownload(draft);
            }}
            className={cn(
              DRAWER_FIELD_CLASS,
              "mb-2 inline-flex items-center justify-center gap-2 border-violet-primary-normal font-semibold text-violet-primary-normal",
            )}
          >
            <Download className="size-4" aria-hidden />
            Download CSV
          </button>
        ) : null
      }
    >
      <div className={DRAWER_FORM_FIELDS_CLASS}>
        <div className="flex flex-col gap-2">
          <Label className="text-[12.5px] font-semibold text-muted-foreground">
            Status
          </Label>
          <Select
            value={draft.status}
            onValueChange={(v) => update("status", v ?? "all_except_canceled")}
          >
            <SelectTrigger className={DRAWER_SELECT_TRIGGER_CLASS}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all_except_canceled">
                All (except canceled)
              </SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="SCHEDULED">Scheduled</SelectItem>
              <SelectItem value="PAST_DUE">Past due</SelectItem>
              <SelectItem value="UNPAID">Unpaid</SelectItem>
              <SelectItem value="PAUSED">Paused</SelectItem>
              <SelectItem value="CANCELED">Canceled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-2">
          <Label className="text-[12.5px] font-semibold text-muted-foreground">
            Membership plan
          </Label>
          <Select
            value={draft.planId}
            onValueChange={(v) => update("planId", v ?? "all")}
          >
            <SelectTrigger className={DRAWER_SELECT_TRIGGER_CLASS}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {plans.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex min-h-11 items-center justify-between gap-4">
          <Label
            htmlFor="memberships-show-versions"
            className="font-normal"
          >
            Show different versions only
          </Label>
          <Switch
            id="memberships-show-versions"
            checked={draft.showDifferentVersionsOnly}
            onCheckedChange={(checked) =>
              update("showDifferentVersionsOnly", checked)
            }
          />
        </div>

        <div className="flex min-h-11 items-center justify-between gap-4">
          <Label htmlFor="memberships-show-older" className="font-normal">
            Show older unpaid (over 1 month)
          </Label>
          <Switch
            id="memberships-show-older"
            checked={draft.showOlderUnpaid}
            onCheckedChange={(checked) => update("showOlderUnpaid", checked)}
          />
        </div>
      </div>
    </OptionsFilterDrawer>
  );
}
