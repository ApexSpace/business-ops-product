"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RecordListEmpty } from "@/features/contacts/components/contact-workspace/contact-record-section";
import { listCheckouts } from "@/features/sales/api/checkouts.api";
import { formatMoney } from "@/features/payments/schemas/payment-profile";
import { queryKeys } from "@/lib/query/keys";
import type { ContactRecordsSectionProps } from "@/features/contacts/workspace/records/contact-records-types";

export function ContactRecordsSalesSection({
  contact,
}: Pick<ContactRecordsSectionProps, "contact">) {
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.checkouts.list({
      contactId: contact.id,
      limit: 50,
      page: 1,
    }),
    queryFn: () =>
      listCheckouts({ contactId: contact.id, page: 1, limit: 50 }),
  });

  const sales = data?.items ?? [];

  if (isLoading) {
    return <RecordListEmpty message="Loading sales…" />;
  }

  if (sales.length === 0) {
    return (
      <div className="space-y-3 p-4">
        <p className="text-sm text-muted-foreground">
          No point-of-sale checkouts for this contact yet.
        </p>
        <Button
          size="sm"
          variant="outline"
          nativeButton={false}
          render={
            <Link href={`/business/sales?contact=${contact.id}`} />
          }
        >
          <Plus className="mr-1 size-3.5" />
          New sale
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-end border-b px-3 py-2">
        <Button
          size="sm"
          variant="outline"
          nativeButton={false}
          render={
            <Link href={`/business/sales?contact=${contact.id}`} />
          }
        >
          <Plus className="mr-1 size-3.5" />
          New sale
        </Button>
      </div>
      <ul className="divide-y overflow-y-auto">
        {sales.map((sale) => (
          <li key={sale.id}>
            <Link
              href={`/business/sales?sale=${sale.id}`}
              className="flex items-center justify-between gap-3 px-4 py-3 text-sm hover:bg-muted/50"
            >
              <div className="min-w-0">
                <p className="font-medium">{sale.saleNumber}</p>
                <p className="text-xs text-muted-foreground">
                  {formatMoney(parseFloat(sale.totalAmount))}
                </p>
              </div>
              <Badge variant={sale.isOpen ? "default" : "secondary"}>
                {sale.isOpen ? "Open" : "Closed"}
              </Badge>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
