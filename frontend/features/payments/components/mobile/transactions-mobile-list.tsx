"use client";

import { Plus } from "lucide-react";
import { MobileEntityListItem } from "@/components/mobile/mobile-entity-list-item";
import { MobileEntityListScreen } from "@/components/mobile/mobile-entity-list-screen";
import { Button } from "@/components/ui/button";
import { MobileAppBottomNav } from "@/components/shell/mobile-app-bottom-nav";
import {
  formatMoney,
  formatPaymentMethod,
  formatSalesListDateSafe,
} from "@/features/payments/utils/transaction-mobile-format";
import type { Payment } from "@/features/payments/types";

export interface TransactionsMobileListProps {
  transactions: Payment[];
  isLoading?: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  selectedId: string | null;
  onSelect: (payment: Payment) => void;
  onOpenFilters?: () => void;
  onCreate?: () => void;
  pagination?: {
    meta: { total: number; page: number; limit: number };
    page: number;
    onPageChange: (page: number) => void;
  };
  className?: string;
}

function transactionPrimary(payment: Payment): string {
  const raw =
    payment.invoice?.invoiceNumber ??
    payment.reference ??
    payment.id.slice(-5);
  const digits = String(raw).match(/(\d+)/)?.[1];
  if (digits) return `#${digits}`;
  return `#${String(raw).replace(/^#/, "").slice(0, 8)}`;
}

export function TransactionsMobileList({
  transactions,
  isLoading = false,
  search,
  onSearchChange,
  selectedId,
  onSelect,
  onOpenFilters,
  onCreate,
  pagination,
  className,
}: TransactionsMobileListProps) {
  return (
    <MobileEntityListScreen
      title="Transactions"
      search={search}
      onSearchChange={onSearchChange}
      onFilter={onOpenFilters}
      filterLabel="Filter transactions"
      showFilter={Boolean(onOpenFilters)}
      onCreate={onCreate}
      createLabel="Record payment"
      canCreate={Boolean(onCreate)}
      isLoading={isLoading}
      isEmpty={transactions.length === 0}
      loadingMessage="Loading transactions…"
      emptyTitle="No transactions yet"
      emptyDescription="Transactions are usually recorded from an invoice."
      emptyAction={
        onCreate ? (
          <Button size="sm" onClick={onCreate}>
            <Plus className="mr-1.5 size-4" />
            Record payment
          </Button>
        ) : null
      }
      pagination={
        pagination && transactions.length > 0
          ? {
              meta: pagination.meta,
              page: pagination.page,
              onPageChange: pagination.onPageChange,
              label: "transactions",
            }
          : undefined
      }
      bottomNav={<MobileAppBottomNav />}
      className={className}
    >
      <ul className="m-0 list-none p-0">
        {transactions.map((payment) => {
          const date = formatSalesListDateSafe(
            payment.paidAt ?? payment.createdAt,
          );
          const method = formatPaymentMethod(payment.method);
          return (
            <li key={payment.id}>
              <MobileEntityListItem
                primary={transactionPrimary(payment)}
                meta={`${method} · ${date}`}
                amount={formatMoney(payment.amount)}
                active={selectedId === payment.id}
                onClick={() => onSelect(payment)}
                aria-label={`${transactionPrimary(payment)}, ${formatMoney(payment.amount)}`}
              />
            </li>
          );
        })}
      </ul>
    </MobileEntityListScreen>
  );
}
