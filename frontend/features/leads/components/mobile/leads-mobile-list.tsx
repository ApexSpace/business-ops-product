"use client";

import { MobileEntityList } from "@/components/mobile/mobile-entity-list";
import { StatusBadge } from "@/components/data-display/status-badge";
import { Button } from "@/components/ui/button";
import type { Lead } from "@/features/leads/types";
import {
  formatLeadValue,
  getLeadDisplayTitle,
  getLeadServiceLabel,
} from "@/features/leads/utils/leads";

export interface LeadsMobileListProps {
  leads: Lead[];
  isLoading?: boolean;
  selectedId: string | null;
  onSelect: (lead: Lead) => void;
  onCreate: () => void;
  pagination?: {
    meta: { total: number; page: number; limit: number,
};
    page: number;
    onPageChange: (page: number) => void;
  };
}

export function LeadsMobileList({
  leads,
  isLoading = false,
  selectedId,
  onSelect,
  onCreate,
  pagination,
}: LeadsMobileListProps) {
  return (
    <MobileEntityList
      title="Leads"
      items={leads}
      getId={(row) => row.id}
      getRow={(row) => {
        const title = getLeadDisplayTitle(row);
        const amount = formatLeadValue(row.value);
        return {
          primary: title,
          meta: `${getLeadServiceLabel(row)} · ${row.pipelineStage.name}`,
          amount,
          status: <StatusBadge status={row.status} domain="lead" />,
          ariaLabel: `${title}, ${amount}`,
        };
      }}
      selectedId={selectedId}
      onSelect={onSelect}
      search=""
      onSearchChange={() => undefined}
      showSearch={false}
      showFilter={false}
      onCreate={onCreate}
      createLabel="New lead"
      canCreate
      isLoading={isLoading}
      loadingMessage="Loading leads…"
      emptyTitle="No leads yet"
      emptyDescription="Create one from a contact or add a new lead."
      emptyAction={
        <Button variant="brand" onClick={onCreate}>
          New lead
        </Button>
      }
      pagination={
        pagination && leads.length > 0
          ? { ...pagination, label: "leads",
}
          : undefined
      }
    />
  );
}
