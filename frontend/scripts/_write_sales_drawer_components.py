from __future__ import annotations

from pathlib import Path

root = Path(r"S:\Programming\FreeLProj\business-ops-product\frontend")
sales = root / "features/sales"
(sales / "styles").mkdir(exist_ok=True)

(sales / "styles/sales-drawer-tokens.ts").write_text(
    '''/**
 * Sales drawer chrome — reuse appointment drawer layout values (already tuned to Figma).
 * Purpose spine uses shared DRAWER_SPINE_* (rounded top-left + bottom-left).
 */
export {
  APPOINTMENT_DRAWER_SHELL_CLASS as SALES_DRAWER_SHELL_CLASS,
  APPOINTMENT_DRAWER_SHELL_HEADER_CLASS as SALES_DRAWER_SHELL_HEADER_CLASS,
  APPOINTMENT_DRAWER_BODY_INSET_CLASS as SALES_DRAWER_BODY_INSET_CLASS,
  APPOINTMENT_DRAWER_FOOTER_CLASS as SALES_DRAWER_FOOTER_CLASS,
  APPOINTMENT_DRAWER_FOOTER_INNER_CLASS as SALES_DRAWER_FOOTER_INNER_CLASS,
  APPOINTMENT_DRAWER_PRIMARY_BUTTON_CLASS as SALES_DRAWER_PRIMARY_BUTTON_CLASS,
  APPOINTMENT_DRAWER_HEADER_ACTION_CLASS as SALES_DRAWER_HEADER_ACTION_CLASS,
  APPOINTMENT_DRAWER_FIELD_CLASS as SALES_DRAWER_FIELD_CLASS,
  APPOINTMENT_DRAWER_SELECT_TRIGGER_CLASS as SALES_DRAWER_SELECT_TRIGGER_CLASS,
  APPOINTMENT_DRAWER_FORM_FIELDS_CLASS as SALES_DRAWER_FORM_FIELDS_CLASS,
  APPOINTMENT_DRAWER_CLIENT_CARD_CLASS as SALES_DRAWER_CLIENT_CARD_CLASS,
  APPOINTMENT_DRAWER_CLIENT_AVATAR_CLASS as SALES_DRAWER_CLIENT_AVATAR_CLASS,
  APPOINTMENT_DRAWER_CLIENT_AVATAR_FALLBACK_CLASS as SALES_DRAWER_CLIENT_AVATAR_FALLBACK_CLASS,
  APPOINTMENT_DRAWER_CLIENT_NAME_CLASS as SALES_DRAWER_CLIENT_NAME_CLASS,
  APPOINTMENT_DRAWER_CLIENT_SINCE_CLASS as SALES_DRAWER_CLIENT_SINCE_CLASS,
  APPOINTMENT_DRAWER_SERVICE_CARD_CLASS as SALES_DRAWER_SERVICE_CARD_CLASS,
  APPOINTMENT_DRAWER_SERVICE_TITLE_CLASS as SALES_DRAWER_SERVICE_TITLE_CLASS,
  APPOINTMENT_DRAWER_SERVICE_PRICE_CLASS as SALES_DRAWER_SERVICE_PRICE_CLASS,
  APPOINTMENT_DRAWER_SERVICE_PROVIDER_CLASS as SALES_DRAWER_SERVICE_PROVIDER_CLASS,
} from "@/features/appointments/styles/appointment-drawer-tokens";

export {
  DRAWER_SPINE_CLASS as SALES_DRAWER_SPINE_CLASS,
  DRAWER_SPINE_LABEL_CLASS as SALES_DRAWER_SPINE_LABEL_CLASS,
} from "@/lib/design/drawer-shell-tokens";

/** Vertical purpose labels for sales drawers (Figma). */
export const SALES_DRAWER_SPINE_LABELS = {
  sale: "SALE",
  options: "OPTIONS",
  checkout: "CHECKOUT",
  payment: "PAYMENT",
} as const;
''',
    encoding="utf-8",
)
print("tokens ok")

(sales / "components/sale-closed-drawer-content.tsx").write_text(
    '''"use client";

import { useQuery } from "@tanstack/react-query";
import { ProfileAvatar } from "@/components/ui/profile-avatar";
import { listPayments } from "@/features/payments/api/payments.api";
import { formatMoney } from "@/features/payments/schemas/payment-profile";
import {
  SALES_DRAWER_BODY_INSET_CLASS,
  SALES_DRAWER_CLIENT_AVATAR_CLASS,
  SALES_DRAWER_CLIENT_AVATAR_FALLBACK_CLASS,
  SALES_DRAWER_CLIENT_CARD_CLASS,
  SALES_DRAWER_CLIENT_NAME_CLASS,
  SALES_DRAWER_CLIENT_SINCE_CLASS,
  SALES_DRAWER_SERVICE_CARD_CLASS,
  SALES_DRAWER_SERVICE_PRICE_CLASS,
  SALES_DRAWER_SERVICE_PROVIDER_CLASS,
  SALES_DRAWER_SERVICE_TITLE_CLASS,
} from "@/features/sales/styles/sales-drawer-tokens";
import type { Checkout } from "@/features/sales/types/checkout";
import { queryKeys } from "@/lib/query/keys";
import { cn } from "@/lib/utils";

export interface SaleClosedDrawerContentProps {
  sale: Checkout;
  className?: string;
}

function money(value: string | number) {
  const n = typeof value === "number" ? value : parseFloat(value);
  return formatMoney(Number.isFinite(n) ? n : 0);
}

function statusSuffix(sale: Checkout) {
  if (sale.status === "VOID") return "Void";
  if (!sale.isOpen) return "Closed";
  return "Open";
}

export function saleDrawerTitle(sale: Checkout) {
  return `${sale.saleNumber}(${statusSuffix(sale)})`;
}

export function SaleClosedDrawerContent({
  sale,
  className,
}: SaleClosedDrawerContentProps) {
  const contactName = sale.contact?.label ?? "Client";
  const tipAmount =
    parseFloat(sale.totalAmount) -
    parseFloat(sale.subtotal) -
    parseFloat(sale.taxAmount) +
    parseFloat(sale.discountAmount);
  const showTip = Number.isFinite(tipAmount) && Math.abs(tipAmount) >= 0.005;

  const paymentFilters = { invoiceId: sale.id, limit: 20 } as const;
  const { data: paymentsData } = useQuery({
    queryKey: queryKeys.payments.list(paymentFilters),
    queryFn: () => listPayments(paymentFilters),
    enabled: Boolean(sale.id),
  });

  const payments = paymentsData?.items ?? [];

  return (
    <div className={cn(SALES_DRAWER_BODY_INSET_CLASS, className)}>
      <div className={SALES_DRAWER_CLIENT_CARD_CLASS}>
        <ProfileAvatar
          name={contactName}
          className={SALES_DRAWER_CLIENT_AVATAR_CLASS}
          fallbackClassName={SALES_DRAWER_CLIENT_AVATAR_FALLBACK_CLASS}
        />
        <div className="min-w-0">
          <p className={SALES_DRAWER_CLIENT_NAME_CLASS}>{contactName}</p>
          <p className={SALES_DRAWER_CLIENT_SINCE_CLASS}>
            {sale.issueDate
              ? `Sale date ${new Date(sale.issueDate).toLocaleDateString("en-US", {
                  month: "long",
                  year: "numeric",
                })}`
              : "Client"}
          </p>
        </div>
      </div>

      <ul className="space-y-4">
        {sale.items.map((item) => (
          <li key={item.id} className={SALES_DRAWER_SERVICE_CARD_CLASS}>
            <p className={SALES_DRAWER_SERVICE_TITLE_CLASS}>{item.title}</p>
            <p className={SALES_DRAWER_SERVICE_PRICE_CLASS}>
              {money(item.totalPrice)}
            </p>
            {item.staff?.label ? (
              <p className={SALES_DRAWER_SERVICE_PROVIDER_CLASS}>
                Provider: {item.staff.label}
              </p>
            ) : null}
          </li>
        ))}
      </ul>

      <div className="space-y-3 border-t border-[#EEEAE6] pt-4">
        <SummaryRow label="Subtotal" value={money(sale.subtotal)} />
        {parseFloat(sale.discountAmount) > 0 ? (
          <SummaryRow
            label="Discount"
            value={`-${money(sale.discountAmount)}`}
          />
        ) : null}
        {parseFloat(sale.taxAmount) > 0 ? (
          <SummaryRow label="Tax" value={money(sale.taxAmount)} />
        ) : null}
        {showTip ? <SummaryRow label="Tip" value={money(tipAmount)} /> : null}
        <SummaryRow
          label="Total"
          value={money(sale.totalAmount)}
          emphasize
        />
      </div>

      <div className="space-y-3 border-t border-[#EEEAE6] pt-4">
        <p className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
          Transactions
        </p>
        {payments.length === 0 ? (
          <p className="text-[13px] text-muted-foreground">
            No payments recorded for this sale.
          </p>
        ) : (
          <ul className="space-y-2">
            {payments.map((payment) => (
              <li
                key={payment.id}
                className="flex items-center justify-between gap-3 text-[14px]"
              >
                <span className="min-w-0 truncate text-foreground">
                  {payment.method.replaceAll("_", " ")}
                </span>
                <span className="shrink-0 font-medium tabular-nums">
                  {money(payment.amount)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  emphasize = false,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 text-[14px]",
        emphasize && "pt-1 font-semibold",
      )}
    >
      <span className={emphasize ? "text-foreground" : "text-muted-foreground"}>
        {label}
      </span>
      <span className="tabular-nums text-foreground">{value}</span>
    </div>
  );
}
''',
    encoding="utf-8",
)
print("closed content ok")

(sales / "components/sales-options-drawer.tsx").write_text(
    '''"use client";

import { useEffect, useState } from "react";
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

  useEffect(() => {
    if (open) setDraft(values);
  }, [open, values]);

  const update = <K extends keyof SalesOptionsValues>(
    key: K,
    value: SalesOptionsValues[K],
  ) => setDraft((prev) => ({ ...prev, [key]: value }));

  return (
    <DrawerShell
      open={open}
      onOpenChange={onOpenChange}
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
            Download
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
''',
    encoding="utf-8",
)
print("options drawer ok")
print("done")
