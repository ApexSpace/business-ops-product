"use client";

import {
  EntityDetailSection,
} from "@/components/layout/entity-detail-section";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatMoney } from "@/features/payments/schemas/payment-profile";

type FinancialLineItem = {
  title: string;
  description?: string | null;
  quantity: string;
  unitPrice: string;
  totalPrice: string;
};

type FinancialTotals = {
  subtotal: string;
  taxAmount: string;
  discountAmount: string;
  totalAmount: string;
};

interface FinancialDocumentLinesProps {
  items: FinancialLineItem[];
  totals: FinancialTotals;
}

export function FinancialDocumentLines({
  items,
  totals,
}: FinancialDocumentLinesProps) {
  const tax = parseFloat(totals.taxAmount) || 0;
  const discount = parseFloat(totals.discountAmount) || 0;

  return (
    <>
      <EntityDetailSection title="Line items">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No line items.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Unit</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, index) => (
                  <TableRow key={`${item.title}-${index}`}>
                    <TableCell>
                      <div className="font-medium">{item.title}</div>
                      {item.description ? (
                        <p className="text-xs text-muted-foreground">
                          {item.description}
                        </p>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {item.quantity}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMoney(item.unitPrice)}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {formatMoney(item.totalPrice)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </EntityDetailSection>

      <div className="rounded-lg border border-border/70 bg-muted/20 px-4 py-3 text-sm">
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="font-medium tabular-nums">
            {formatMoney(totals.subtotal)}
          </span>
        </div>
        {tax > 0 ? (
          <div className="mt-1 flex justify-between gap-4">
            <span className="text-muted-foreground">Tax</span>
            <span className="tabular-nums">{formatMoney(tax)}</span>
          </div>
        ) : null}
        {discount > 0 ? (
          <div className="mt-1 flex justify-between gap-4">
            <span className="text-muted-foreground">Discount</span>
            <span className="tabular-nums">−{formatMoney(discount)}</span>
          </div>
        ) : null}
        <div className="mt-2 flex justify-between gap-4 border-t border-border/60 pt-2 text-base font-semibold">
          <span>Total</span>
          <span className="tabular-nums">{formatMoney(totals.totalAmount)}</span>
        </div>
      </div>
    </>
  );
}
