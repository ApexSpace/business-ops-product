"use client";

import { PublicInvoicePage } from "@/features/invoices/components/public-invoice-page";

/** Legacy path — canonical route is `/invoice/:token`. */
export default function PublicInvoicePayPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  return <PublicInvoicePage params={params} />;
}
