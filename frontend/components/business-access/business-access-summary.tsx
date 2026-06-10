import type { BusinessTenantAccess } from "@/lib/business-access/types";

function formatPaymentStatus(status?: string | null): string | null {
  if (!status) return null;
  return status
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function BusinessAccessSummary({
  access,
}: {
  access: BusinessTenantAccess;
}) {
  const paymentStatus = formatPaymentStatus(access.subscription?.paymentStatus);

  return (
    <dl className="grid gap-2 text-sm text-muted-foreground">
      <div className="flex flex-wrap gap-x-2">
        <dt className="font-medium text-foreground">Business:</dt>
        <dd>{access.businessName}</dd>
      </div>
      {access.subscription?.planTierName ? (
        <div className="flex flex-wrap gap-x-2">
          <dt className="font-medium text-foreground">Plan:</dt>
          <dd>{access.subscription.planTierName}</dd>
        </div>
      ) : null}
      {paymentStatus ? (
        <div className="flex flex-wrap gap-x-2">
          <dt className="font-medium text-foreground">Payment status:</dt>
          <dd>{paymentStatus}</dd>
        </div>
      ) : null}
    </dl>
  );
}
