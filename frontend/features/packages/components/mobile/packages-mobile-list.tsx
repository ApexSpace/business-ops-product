"use client";

import { MobileEntityList } from "@/components/mobile/mobile-entity-list";
import { StatusPill, type StatusPillVariant } from "@/components/data-display/status-pill";
import { ListPrimaryAction } from "@/components/layout/list-primary-action";
import { packageDisplayName } from "@/features/packages/components/package-detail-panel";
import type {
  ClientPackageListItem,
  ClientPackageStatus,
} from "@/features/packages/types";
import { formatMoney } from "@/features/payments/schemas/payment-profile";
import { formatSalesListDate } from "@/features/sales/utils/sales-list-format";

function packageStatusVariant(status: ClientPackageStatus): StatusPillVariant {
  switch (status) {
    case "ACTIVE":
      return "success";
    case "EXPIRED":
      return "warning";
    case "DEPLETED":
      return "neutral";
    case "TRANSFERRED":
      return "info";
    case "DELETED":
      return "danger";
    default:
      return "neutral";
  }
}

function packageStatusLabel(status: ClientPackageStatus): string {
  return status
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export interface PackagesMobileListProps {
  packages: ClientPackageListItem[];
  isLoading?: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  selectedId: string | null;
  onSelect: (row: ClientPackageListItem) => void;
  onCreate?: () => void;
  canCreate?: boolean;
  pagination?: {
    meta: { total: number; page: number; limit: number,
};
    page: number;
    onPageChange: (page: number) => void;
  };
}

export function PackagesMobileList({
  packages,
  isLoading = false,
  search,
  onSearchChange,
  selectedId,
  onSelect,
  onCreate,
  canCreate = false,
  pagination,
}: PackagesMobileListProps) {
  return (
    <MobileEntityList
      title="Packages"
      items={packages}
      getId={(row) => row.id}
      getRow={(row) => {
        const amount = formatMoney(row.packageTemplate.totalPrice);
        const date = formatSalesListDate(row.purchaseDate);
        const name = packageDisplayName(row);
        const meta = row.isDemo ? `Demo · ${name} · ${date}` : `${name} · ${date}`;
        const label = packageStatusLabel(row.status);
        return {
          primary: row.contact.name,
          meta,
          amount,
          status: (
            <StatusPill label={label} variant={packageStatusVariant(row.status)} />
          ),
          ariaLabel: `${row.contact.name}, ${amount}`,
        };
      }}
      selectedId={selectedId}
      onSelect={onSelect}
      search={search}
      onSearchChange={onSearchChange}
      searchPlaceholder="Search by name or client…"
      showFilter={false}
      onCreate={onCreate}
      createLabel="New package"
      canCreate={canCreate}
      isLoading={isLoading}
      loadingMessage="Loading packages…"
      emptyTitle="No client packages yet"
      emptyDescription="Add a package to assign prepaid services to a client."
      emptyAction={
        canCreate && onCreate ? (
          <ListPrimaryAction
            label="New Package"
            showIcon={false}
            onClick={onCreate}
          />
        ) : null
      }
      pagination={
        pagination && packages.length > 0
          ? { ...pagination, label: "packages",
}
          : undefined
      }
    />
  );
}
