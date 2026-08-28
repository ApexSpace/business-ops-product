"use client";

import {
  EntityDetailField,
  EntityDetailFieldGrid,
  EntityDetailSection,
} from "@/components/layout/entity-detail-section";
import {
  formatInvoiceDate,
  formatInvoiceStatus,
  formatMoney,
} from "@/features/invoices/schemas/invoice-profile";
import type { Invoice } from "@/features/invoices/types";
import { FinancialDocumentLines } from "@/features/payments/components/workspace/financial-document-lines";
import { getInvoiceDisplayName } from "@/features/payments/utils/financial-table-display";

interface InvoiceDetailPanelProps {
  invoice: Invoice;
}

export function InvoiceDetailPanel({ invoice }: InvoiceDetailPanelProps) {
  const balanceDue = parseFloat(invoice.balanceDue) || 0;
  const paidAmount = parseFloat(invoice.paidAmount) || 0;

  return (
    <div className="space-y-6">
      <EntityDetailFieldGrid>
        <EntityDetailField label="Invoice name">
          {getInvoiceDisplayName(invoice)}
        </EntityDetailField>
        <EntityDetailField label="Customer">
          {invoice.contact?.label ?? ""}
        </EntityDetailField>
        <EntityDetailField label="Issue date">
          {formatInvoiceDate(invoice.issueDate)}
        </EntityDetailField>
        <EntityDetailField label="Due date">
          {formatInvoiceDate(invoice.dueDate)}
        </EntityDetailField>
        <EntityDetailField label="Status">
          {formatInvoiceStatus(invoice.status)}
        </EntityDetailField>
        {invoice.estimate ? (
          <EntityDetailField label="From estimate">
            {invoice.estimate.estimateNumber}
          </EntityDetailField>
        ) : null}
      </EntityDetailFieldGrid>

      <FinancialDocumentLines
        items={invoice.items}
        totals={{
          subtotal: invoice.subtotal,
          taxAmount: invoice.taxAmount,
          discountAmount: invoice.discountAmount,
          totalAmount: invoice.totalAmount,
        }}
      />

      <div className="rounded-lg border border-border/70 bg-muted/20 px-4 py-3 text-sm">
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Paid</span>
          <span className="tabular-nums">{formatMoney(paidAmount)}</span>
        </div>
        <div className="mt-1 flex justify-between gap-4 font-semibold">
          <span>Balance due</span>
          <span className="tabular-nums">{formatMoney(balanceDue)}</span>
        </div>
      </div>

      {invoice.notes ? (
        <EntityDetailSection title="Notes">
          <p className="text-sm whitespace-pre-wrap">{invoice.notes}</p>
        </EntityDetailSection>
      ) : null}

      {invoice.paymentTerms ? (
        <EntityDetailSection title="Payment terms">
          <p className="text-sm whitespace-pre-wrap">{invoice.paymentTerms}</p>
        </EntityDetailSection>
      ) : null}

      {invoice.termsAndConditions ? (
        <EntityDetailSection title="Terms & conditions">
          <p className="text-sm whitespace-pre-wrap">
            {invoice.termsAndConditions}
          </p>
        </EntityDetailSection>
      ) : null}
    </div>
  );
}
