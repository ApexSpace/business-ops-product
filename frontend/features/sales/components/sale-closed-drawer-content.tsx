"use client";

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
import {
  getCheckoutCustomFeeLines,
  isSystemManagedCustomFeeItem,
  merchandiseSubtotalFromCheckout,
} from "@/features/sales/utils/checkout-custom-fees";
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

  const paymentFilters = { invoiceId: sale.id, limit: 20,
} as const;
  const { data: paymentsData } = useQuery({
    queryKey: queryKeys.payments.list(paymentFilters),
    queryFn: () => listPayments(paymentFilters),
    enabled: Boolean(sale.id),
  });

  const payments = paymentsData?.items ?? [];
  const customFeeLines = getCheckoutCustomFeeLines(sale.items);
  const merchandiseItems = sale.items.filter(
    (item) => !isSystemManagedCustomFeeItem(item),
  );
  const merchandiseSubtotal = merchandiseSubtotalFromCheckout(
    sale.subtotal,
    customFeeLines,
  );
  const tipRaw = sale.tipAmount ?? (sale as { metadata?: { tipAmount?: number } }).metadata?.tipAmount;
  const tipAmount =
    typeof tipRaw === "string"
      ? parseFloat(tipRaw)
      : typeof tipRaw === "number"
        ? tipRaw
        : 0;
  const showProvider = sale.advancedSettings?.showServiceProviderOnReceipt ?? true;
  const receiptFooter = sale.advancedSettings?.receiptCustomFooterText?.trim();

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
              ? `Client since ${new Date(sale.issueDate).toLocaleDateString(
                  "en-US",
                  {
                    month: "long",
                    year: "numeric",
                  },
                )}`
              : "Client"}
          </p>
        </div>
      </div>

      <ul className="space-y-4">
        {merchandiseItems.map((item) => (
          <li key={item.id} className={SALES_DRAWER_SERVICE_CARD_CLASS}>
            <p className={SALES_DRAWER_SERVICE_TITLE_CLASS}>{item.title}</p>
            <p className={SALES_DRAWER_SERVICE_PRICE_CLASS}>
              {money(item.totalPrice)}
            </p>
            {showProvider && item.staff?.label ? (
              <p className={SALES_DRAWER_SERVICE_PROVIDER_CLASS}>
                Provider: {item.staff.label}
              </p>
            ) : null}
          </li>
        ))}
      </ul>

      <div className="space-y-3 border-t border-[#EEEAE6] pt-4">
        <SummaryRow label="Subtotal" value={money(merchandiseSubtotal)} />
        {customFeeLines.map((fee) => (
          <SummaryRow key={fee.id} label={fee.name} value={money(fee.amount)} />
        ))}
        {parseFloat(sale.discountAmount) > 0 ? (
          <SummaryRow
            label="Discount"
            value={`-${money(sale.discountAmount)}`}
          />
        ) : null}
        {parseFloat(sale.taxAmount) > 0 ? (
          <SummaryRow label="Tax" value={money(sale.taxAmount)} />
        ) : null}
        {tipAmount > 0 ? (
          <SummaryRow label="Tip" value={money(tipAmount)} />
        ) : null}
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

      {receiptFooter ? (
        <p className="border-t border-[#EEEAE6] pt-4 text-center text-[12px] text-muted-foreground">
          {receiptFooter}
        </p>
      ) : null}
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
