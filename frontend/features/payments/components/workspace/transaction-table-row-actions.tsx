"use client";

import { FinancialRowActionsMenu } from "@/features/payments/components/workspace/financial-row-actions-menu";

interface TransactionTableRowActionsProps {
  onView: () => void;
  onRefund?: () => void;
}

export function TransactionTableRowActions({
  onView,
  onRefund,
}: TransactionTableRowActionsProps) {
  return (
    <div className="flex items-center justify-end gap-0.5">
      <FinancialRowActionsMenu
        viewLabel="View invoice"
        onView={onView}
        onRefund={onRefund}
      />
    </div>
  );
}
