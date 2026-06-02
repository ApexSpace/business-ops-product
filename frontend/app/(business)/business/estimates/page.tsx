import { redirect } from "next/navigation";

export default function BusinessEstimatesRedirectPage() {
  redirect("/business/payments?tab=estimates");
}
