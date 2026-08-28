"use client";

import { useState } from "react";
import { OptionsFilterDrawer } from "@/components/layout/options-filter-drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DRAWER_FIELD_CLASS,
  DRAWER_FORM_FIELDS_CLASS,
  DRAWER_SELECT_TRIGGER_CLASS,
} from "@/lib/design/drawer-tokens";
import { cn } from "@/lib/utils";

export type SalesOptionsStatus = "all" | "OPEN" | "PAID" | "VOID";

export interface SalesOptionsValues {
  status: SalesOptionsStatus;
  saleNumber: string;
  clientQuery: string;
  amountFrom: string;
  amountTo: string;
  paymentMethod: string;
  saleDate: string;
  staffQuery: string;
}

export const EMPTY_SALES_OPTIONS: SalesOptionsValues = {
  status: "all",
  saleNumber: "",
  clientQuery: "",
  amountFrom: "",
  amountTo: "",
  paymentMethod: "",
  saleDate: "",
  staffQuery: "",
};

export interface SalesOptionsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  values: SalesOptionsValues;
  onApply: (values: SalesOptionsValues) => void;
  onViewTransactions?: () => void;
  onDownload?: () => void;
}

export function SalesOptionsDrawer({
  open,
  onOpenChange,
  values,
  onApply,
  onViewTransactions,
  onDownload,
}: SalesOptionsDrawerProps) {
  const [draft, setDraft] = useState<SalesOptionsValues>(values);

  const handleOpenChange = (next: boolean) => {
    if (next) setDraft(values);
    onOpenChange(next);
  };

  const update = <K extends keyof SalesOptionsValues>(
    key: K,
    value: SalesOptionsValues[K],
  ) => setDraft((prev) => ({ ...prev, [key]: value }));

  return (
    <OptionsFilterDrawer
      open={open}
      onOpenChange={handleOpenChange}
      spineLabel="OPTIONS"
      onApply={() => {
        onApply(draft);
        onDownload?.();
      }}
      leading={
        onViewTransactions ? (
          <button
            type="button"
            onClick={onViewTransactions}
            className={cn(
              DRAWER_FIELD_CLASS,
              "inline-flex items-center justify-center border-violet-primary-normal font-semibold text-violet-primary-normal",
            )}
          >
            View Transactions
          </button>
        ) : null
      }
    >
      <div className={DRAWER_FORM_FIELDS_CLASS}>
        <Field label="Type">
          <Select defaultValue="sale">
            <SelectTrigger className={DRAWER_SELECT_TRIGGER_CLASS}>
              <SelectValue placeholder="Select Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sale">Sale</SelectItem>
              <SelectItem value="refund">Refund</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        <Field label="Sales or Refund #">
          <Input
            className={DRAWER_FIELD_CLASS}
            placeholder="Enter Sales and Refund #"
            value={draft.saleNumber}
            onChange={(e) => update("saleNumber", e.target.value)}
          />
        </Field>

        <Field label="Client">
          <Input
            className={DRAWER_FIELD_CLASS}
            placeholder="Search for Client"
            value={draft.clientQuery}
            onChange={(e) => update("clientQuery", e.target.value)}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="From Amount">
            <Input
              className={DRAWER_FIELD_CLASS}
              placeholder="Enter Amount"
              inputMode="decimal"
              value={draft.amountFrom}
              onChange={(e) => update("amountFrom", e.target.value)}
            />
          </Field>
          <Field label="To Amount">
            <Input
              className={DRAWER_FIELD_CLASS}
              placeholder="Enter Amount"
              inputMode="decimal"
              value={draft.amountTo}
              onChange={(e) => update("amountTo", e.target.value)}
            />
          </Field>
        </div>

        <Field label="Status">
          <Select
            value={draft.status}
            onValueChange={(v) =>
              update("status", (v ?? "all") as SalesOptionsStatus)
            }
          >
            <SelectTrigger className={DRAWER_SELECT_TRIGGER_CLASS}>
              <SelectValue placeholder="Select Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="OPEN">Open</SelectItem>
              <SelectItem value="PAID">Closed</SelectItem>
              <SelectItem value="VOID">Void</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        <Field label="Sale Payment Method">
          <Select
            value={draft.paymentMethod || undefined}
            onValueChange={(v) => update("paymentMethod", v ?? "")}
          >
            <SelectTrigger className={DRAWER_SELECT_TRIGGER_CLASS}>
              <SelectValue placeholder="Select Sale Payment Method" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="CASH">Cash</SelectItem>
              <SelectItem value="CARD">Card</SelectItem>
              <SelectItem value="OTHER">Other</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        <Field label="Sale Date">
          <Input
            type="date"
            className={DRAWER_FIELD_CLASS}
            value={draft.saleDate}
            onChange={(e) => update("saleDate", e.target.value)}
          />
        </Field>

        <Field label="Includes Staff Member">
          <Input
            className={DRAWER_FIELD_CLASS}
            placeholder="Select Staff Member"
            value={draft.staffQuery}
            onChange={(e) => update("staffQuery", e.target.value)}
          />
        </Field>
      </div>
    </OptionsFilterDrawer>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label className="text-[12.5px] font-semibold text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}
