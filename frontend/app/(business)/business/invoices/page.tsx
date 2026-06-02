import { redirect } from "next/navigation";

export default function BusinessInvoicesRedirectPage() {
  redirect("/business/payments?tab=invoices");
}
