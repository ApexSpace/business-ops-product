"use client";

import { MobileEntityList } from "@/components/mobile/mobile-entity-list";
import { ListPrimaryAction } from "@/components/layout/list-primary-action";
import {
  MembershipStatusBadge,
  formatMembershipPrice,
  membershipPlanLabel,
} from "@/features/memberships/components/membership-detail-panel";
import type { ClientMembershipListItem } from "@/features/memberships/types";
import { formatSalesListDate } from "@/features/sales/utils/sales-list-format";

export interface MembershipsMobileListProps {
  memberships: ClientMembershipListItem[];
  isLoading?: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  selectedId: string | null;
  onSelect: (row: ClientMembershipListItem) => void;
  onOpenOptions: () => void;
  onCreate?: () => void;
  canCreate?: boolean;
  pagination?: {
    meta: { total: number; page: number; limit: number,
};
    page: number;
    onPageChange: (page: number) => void;
  };
}

export function MembershipsMobileList({
  memberships,
  isLoading = false,
  search,
  onSearchChange,
  selectedId,
  onSelect,
  onOpenOptions,
  onCreate,
  canCreate = false,
  pagination,
}: MembershipsMobileListProps) {
  return (
    <MobileEntityList
      title="Memberships"
      items={memberships}
      getId={(row) => row.id}
      getRow={(row) => {
        const amount = formatMembershipPrice(row.price, row.billingIntervalUnit);
        return {
          primary: row.contact.name,
          meta: `${membershipPlanLabel(row)} · ${formatSalesListDate(row.startDate)}`,
          amount,
          status: <MembershipStatusBadge status={row.status} />,
          ariaLabel: `${row.contact.name}, ${amount}`,
        };
      }}
      selectedId={selectedId}
      onSelect={onSelect}
      search={search}
      onSearchChange={onSearchChange}
      searchPlaceholder="Search by client or plan…"
      onFilter={onOpenOptions}
      filterLabel="Membership options"
      onCreate={onCreate}
      createLabel="New membership"
      canCreate={canCreate}
      isLoading={isLoading}
      loadingMessage="Loading memberships…"
      emptyTitle="No memberships found"
      emptyDescription="Start a membership for a client or adjust your filters."
      emptyAction={
        canCreate && onCreate ? (
          <ListPrimaryAction
            label="New Membership"
            showIcon={false}
            onClick={onCreate}
          />
        ) : null
      }
      pagination={
        pagination && memberships.length > 0
          ? { ...pagination, label: "memberships",
}
          : undefined
      }
    />
  );
}
