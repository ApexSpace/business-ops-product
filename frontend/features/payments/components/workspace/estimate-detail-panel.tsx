"use client";

import {
  EntityDetailField,
  EntityDetailFieldGrid,
  EntityDetailSection,
} from "@/components/layout/entity-detail-section";
import {
  formatEstimateDate,
  formatEstimateStatus,
} from "@/features/estimates/schemas/estimate-profile";
import type { Estimate } from "@/features/estimates/types";
import { FinancialDocumentLines } from "@/features/payments/components/workspace/financial-document-lines";
import { getEstimateQuoteName } from "@/features/payments/utils/financial-table-display";

interface EstimateDetailPanelProps {
  estimate: Estimate;
}

export function EstimateDetailPanel({ estimate }: EstimateDetailPanelProps) {
  return (
    <div className="space-y-6">
      <EntityDetailFieldGrid>
        <EntityDetailField label="Quote name">
          {getEstimateQuoteName(estimate)}
        </EntityDetailField>
        <EntityDetailField label="Customer">
          {estimate.contact?.label ?? "—"}
        </EntityDetailField>
        <EntityDetailField label="Issue date">
          {formatEstimateDate(estimate.issueDate)}
        </EntityDetailField>
        <EntityDetailField label="Expiry date">
          {formatEstimateDate(estimate.expiryDate)}
        </EntityDetailField>
        <EntityDetailField label="Status">
          {formatEstimateStatus(estimate.status)}
        </EntityDetailField>
        {estimate.workItem ? (
          <EntityDetailField label="Work item">
            {estimate.workItem.title}
          </EntityDetailField>
        ) : null}
      </EntityDetailFieldGrid>

      <FinancialDocumentLines
        items={estimate.items}
        totals={{
          subtotal: estimate.subtotal,
          taxAmount: estimate.taxAmount,
          discountAmount: estimate.discountAmount,
          totalAmount: estimate.totalAmount,
        }}
      />

      {estimate.notes ? (
        <EntityDetailSection title="Notes">
          <p className="text-sm whitespace-pre-wrap">{estimate.notes}</p>
        </EntityDetailSection>
      ) : null}

      {estimate.termsAndConditions ? (
        <EntityDetailSection title="Terms & conditions">
          <p className="text-sm whitespace-pre-wrap">
            {estimate.termsAndConditions}
          </p>
        </EntityDetailSection>
      ) : null}
    </div>
  );
}
