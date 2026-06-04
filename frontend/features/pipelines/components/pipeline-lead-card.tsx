"use client";

import {
  BoardCard,
  BoardCardBody,
  BoardCardField,
  BoardCardHeader,
} from "@/components/board";
import {
  formatLeadValue,
  getLeadServiceLabel,
} from "@/features/leads/utils/leads";
import type { Lead } from "@/features/leads/types";

interface PipelineLeadCardProps {
  lead: Lead;
  isOverlay?: boolean;
  isMoving?: boolean;
  onOpen?: (lead: Lead) => void;
}

export function PipelineLeadCard({
  lead,
  isOverlay,
  isMoving,
  onOpen,
}: PipelineLeadCardProps) {
  const cardTitle = lead.title?.trim() || "Untitled lead";
  const serviceLabel = getLeadServiceLabel(lead);
  const valueLabel = formatLeadValue(lead.value);

  return (
    <BoardCard
      id={lead.id}
      dragData={{ type: "lead", lead }}
      isOverlay={isOverlay}
      isMoving={isMoving}
    >
      <BoardCardHeader
        title={cardTitle}
        onTitleClick={onOpen && !isOverlay ? () => onOpen(lead) : undefined}
      />

      <BoardCardBody>
        <BoardCardField label="Source" value={lead.source} />
        <BoardCardField
          label="Service"
          value={serviceLabel !== "—" ? serviceLabel : null}
        />
        <BoardCardField
          label="Value"
          value={valueLabel !== "—" ? valueLabel : null}
        />
      </BoardCardBody>
    </BoardCard>
  );
}
