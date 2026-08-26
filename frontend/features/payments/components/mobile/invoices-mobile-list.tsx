"use client";

import { MobileEntityList } from "@/components/mobile/mobile-entity-list";
import { StatusBadge } from "@/components/data-display/status-badge";
import { Button } from "@/components/ui/button";
import type { Invoice } from "@/features/invoices/types";
import { getInvoiceDisplayName } from "@/features/payments/utils/financial-table-display";
import {
  formatMoney,
  formatSalesListDateSafe,
} from "@/features/payments/utils/transaction-mobile-format";

export interface InvoicesMobileListProps {
  invoices: Invoice[];
  isLoading?: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  selectedId: string | null;
  onSelect: (invoice: Invoice) => void;
  onCreate: () => void;
  pagination?: {
    meta: { total: number; page: number; limit: number,
};
    page: number;
    onPageChange: (page: number) => void;
  };
}

export function InvoicesMobileList({
  invoices,
  isLoading = false,
  search,
  onSearchChange,
  selectedId,
  onSelect,
  onCreate,
  pagination,
}: InvoicesMobileListProps) {
  return (
    <MobileEntityList
      title="Invoices"
      items={invoices}
      getId={(row) => row.id}
      getRow={(row) => {
        const amount = formatMoney(row.totalAmount);
        const name = getInvoiceDisplayName(row);
        const contact = row.contact?.label?.trim() || "—";
        const date = formatSalesListDateSafe(row.issueDate);
        return {
          primary: name,
          meta: `${row.invoiceNumber} · ${contact} · ${date}`,
          amount,
          status: <StatusBadge status={row.status} domain="invoice" />,
          ariaLabel: `${name}, ${amount}`,
        };
      }}
      selectedId={selectedId}
      onSelect={onSelect}
      search={search}
      onSearchChange={onSearchChange}
      searchPlaceholder="Search invoices…"
      showFilter={false}
      onCreate={onCreate}
      createLabel="New invoice"
      canCreate
      isLoading={isLoading}
      loadingMessage="Loading invoices…"
      emptyTitle="No invoices yet"
      emptyDescription="Create your first invoice for a customer."
      emptyAction={
        <Button size="sm" onClick={onCreate}>
          New invoice
        </Button>
      }
      pagination={
        pagination && invoices.length > 0
          ? { ...pagination, label: "invoices",
}
          : undefined
      }
    />
  );
}
