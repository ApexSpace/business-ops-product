"use client";

import { useState } from "react";
import { MoreHorizontal } from "lucide-react";
import { DrawerHeaderContent } from "@/components/drawer/drawer-header-content";
import { DrawerPrimaryButton } from "@/components/drawer/drawer-primary-button";
import { DrawerShell } from "@/components/layout/drawer-shell";
import { IconButton } from "@/components/ui/icon-button";
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
  SALES_DRAWER_BODY_INSET_CLASS,
  SALES_DRAWER_FIELD_CLASS,
  SALES_DRAWER_FOOTER_CLASS,
  SALES_DRAWER_FOOTER_INNER_CLASS,
  SALES_DRAWER_FORM_FIELDS_CLASS,
  SALES_DRAWER_HEADER_ACTION_CLASS,
  SALES_DRAWER_SELECT_TRIGGER_CLASS,
  SALES_DRAWER_SHELL_CLASS,
  SALES_DRAWER_SHELL_HEADER_CLASS,
  SALES_DRAWER_SPINE_LABELS,
} from "@/features/sales/styles/sales-drawer-tokens";
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
    <DrawerShell
      open={open}
      onOpenChange={handleOpenChange}
      variant="sheet"
      width="appointment"
      spineLabel={SALES_DRAWER_SPINE_LABELS.options}
      className={SALES_DRAWER_SHELL_CLASS}
      headerClassName={SALES_DRAWER_SHELL_HEADER_CLASS}
      contentClassName="!px-0 !py-0"
      footerClassName={SALES_DRAWER_FOOTER_CLASS}
      title={<DrawerHeaderContent title="Options" />}
      headerActions={
        <IconButton
          type="button"
          variant="ghost"
          aria-label="More options"
          className={SALES_DRAWER_HEADER_ACTION_CLASS}
        >
          <MoreHorizontal className="size-4" />
        </IconButton>
      }
      footer={
        <div className={SALES_DRAWER_FOOTER_INNER_CLASS}>
          <DrawerPrimaryButton
            onClick={() => {
              onApply(draft);
              onOpenChange(false);
              onDownload?.();
            }}
          >
            Apply
          </DrawerPrimaryButton>
        </div>
      }
    >
      <div className={cn(SALES_DRAWER_BODY_INSET_CLASS, "pb-2")}>
        {onViewTransactions ? (
          <button
            type="button"
            onClick={onViewTransactions}
            className={cn(
              SALES_DRAWER_FIELD_CLASS,
              "inline-flex items-center justify-center border-violet-primary-normal font-semibold text-violet-primary-normal",
            )}
          >
            View Transactions
          </button>
        ) : null}

        <div className={SALES_DRAWER_FORM_FIELDS_CLASS}>
          <Field label="Type">
            <Select defaultValue="sale">
              <SelectTrigger className={SALES_DRAWER_SELECT_TRIGGER_CLASS}>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sale">Sale</SelectItem>
                <SelectItem value="refund">Refund</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <Field label="Sales or Refund #">
            <Input
              className={SALES_DRAWER_FIELD_CLASS}
              placeholder="Enter sales and refund #"
              value={draft.saleNumber}
              onChange={(e) => update("saleNumber", e.target.value)}
            />
          </Field>

          <Field label="Client">
            <Input
              className={SALES_DRAWER_FIELD_CLASS}
              placeholder="Search for client"
              value={draft.clientQuery}
              onChange={(e) => update("clientQuery", e.target.value)}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="From Amount">
              <Input
                className={SALES_DRAWER_FIELD_CLASS}
                placeholder="Enter amount"
                inputMode="decimal"
                value={draft.amountFrom}
                onChange={(e) => update("amountFrom", e.target.value)}
              />
            </Field>
            <Field label="To Amount">
              <Input
                className={SALES_DRAWER_FIELD_CLASS}
                placeholder="Enter amount"
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
              <SelectTrigger className={SALES_DRAWER_SELECT_TRIGGER_CLASS}>
                <SelectValue placeholder="Select status" />
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
              <SelectTrigger className={SALES_DRAWER_SELECT_TRIGGER_CLASS}>
                <SelectValue placeholder="Select sale payment method" />
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
              className={SALES_DRAWER_FIELD_CLASS}
              value={draft.saleDate}
              onChange={(e) => update("saleDate", e.target.value)}
            />
          </Field>

          <Field label="Includes Staff Member">
            <Input
              className={SALES_DRAWER_FIELD_CLASS}
              placeholder="Select staff member"
              value={draft.staffQuery}
              onChange={(e) => update("staffQuery", e.target.value)}
            />
          </Field>
        </div>
      </div>
    </DrawerShell>
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
