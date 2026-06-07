"use client";

import { PublicInvoicePage } from "@/features/invoices/components/public-invoice-page";

export default function InvoicePublicPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  return <PublicInvoicePage params={params} />;
}
