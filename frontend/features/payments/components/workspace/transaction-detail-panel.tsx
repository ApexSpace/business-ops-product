"use client";

import {
  EntityDetailField,
  EntityDetailFieldGrid,
  EntityDetailSection,
} from "@/components/layout/entity-detail-section";
import {
  formatMoney,
  formatPaymentDate,
  formatTransactionProvider,
  formatTransactionSource,
  getTransactionStatusLabel,
} from "@/features/payments/schemas/payment-profile";
import type { Payment } from "@/features/payments/types";

interface TransactionDetailPanelProps {
  payment: Payment;
}

export function TransactionDetailPanel({ payment }: TransactionDetailPanelProps) {
  return (
    <div className="space-y-6">
      <EntityDetailFieldGrid>
        <EntityDetailField label="Customer">
          {payment.contact?.label ?? ""}
        </EntityDetailField>
        <EntityDetailField label="Amount">
          <span className="font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
            {formatMoney(payment.amount)}
          </span>
        </EntityDetailField>
        <EntityDetailField label="Status">
          {getTransactionStatusLabel(payment)}
        </EntityDetailField>
        <EntityDetailField label="Provider">
          {formatTransactionProvider(payment)}
        </EntityDetailField>
        <EntityDetailField label="Source">
          {formatTransactionSource(payment)}
        </EntityDetailField>
        <EntityDetailField label="Transaction date">
          {formatPaymentDate(payment.paidAt ?? payment.createdAt)}
        </EntityDetailField>
        {payment.reference ? (
          <EntityDetailField label="Reference">
            {payment.reference}
          </EntityDetailField>
        ) : null}
      </EntityDetailFieldGrid>

      {payment.invoice ? (
        <EntityDetailSection title="Linked invoice">
          <EntityDetailFieldGrid>
            <EntityDetailField label="Invoice number">
              {payment.invoice.invoiceNumber}
            </EntityDetailField>
            <EntityDetailField label="Invoice total">
              {formatMoney(payment.invoice.totalAmount)}
            </EntityDetailField>
            <EntityDetailField label="Balance due">
              {formatMoney(payment.invoice.balanceDue)}
            </EntityDetailField>
          </EntityDetailFieldGrid>
        </EntityDetailSection>
      ) : null}

      {payment.notes ? (
        <EntityDetailSection title="Notes">
          <p className="text-sm whitespace-pre-wrap">{payment.notes}</p>
        </EntityDetailSection>
      ) : null}
    </div>
  );
}
