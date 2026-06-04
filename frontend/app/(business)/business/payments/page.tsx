"use client";

import { Suspense } from "react";
import { ListPageSkeleton } from "@/components/layout/list-page";
import { PaymentsWorkspace } from "@/features/payments/components/payments-workspace";

export default function BusinessPaymentsPage() {
  return (
    <Suspense fallback={<ListPageSkeleton />}>
      <PaymentsWorkspace />
    </Suspense>
  );
}
