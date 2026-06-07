import { redirect } from "next/navigation";

export default async function PaymentAliasPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { token } = await params;
  const query = await searchParams;
  const payment = query.payment;
  const suffix =
    typeof payment === "string"
      ? `?payment=${encodeURIComponent(payment)}`
      : "";
  redirect(`/invoice/${token}${suffix}`);
}
