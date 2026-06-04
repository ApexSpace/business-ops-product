"use client";

import { apiPhoneToFormValue } from "@/lib/forms/phone";
import type { Business } from "@/features/platform/types";

export function PlatformBusinessOverviewTab({
  business,
}: {
  business: Business;
}) {
  return (
    <dl className="grid gap-3 text-sm sm:grid-cols-2">
      <div>
        <dt className="text-muted-foreground">Contact</dt>
        <dd>
          {business.displayName ||
            [business.firstName, business.lastName]
              .filter(Boolean)
              .join(" ") ||
            "—"}
        </dd>
      </div>
      <div>
        <dt className="text-muted-foreground">Email</dt>
        <dd>{business.email ?? "—"}</dd>
      </div>
      <div>
        <dt className="text-muted-foreground">Phone</dt>
        <dd>
          {apiPhoneToFormValue(
            null,
            business.phoneCountryCode,
            business.phoneNumber,
          ) || "—"}
        </dd>
      </div>
      <div>
        <dt className="text-muted-foreground">Industry</dt>
        <dd>{business.industry?.name ?? "—"}</dd>
      </div>
      <div className="sm:col-span-2">
        <dt className="text-muted-foreground">Address</dt>
        <dd>
          {[
            business.address,
            [business.city, business.state].filter(Boolean).join(", "),
            business.country,
            business.zip,
          ]
            .filter(Boolean)
            .join(" · ") || "—"}
        </dd>
      </div>
      <div>
        <dt className="text-muted-foreground">Website</dt>
        <dd>
          {business.website ? (
            <a
              href={business.website}
              target="_blank"
              rel="noreferrer"
              className="text-primary hover:underline"
            >
              {business.website}
            </a>
          ) : (
            "—"
          )}
        </dd>
      </div>
      <div>
        <dt className="text-muted-foreground">Timezone</dt>
        <dd>{business.timezone ?? "—"}</dd>
      </div>
      <div>
        <dt className="text-muted-foreground">ID</dt>
        <dd className="font-mono text-xs">{business.id}</dd>
      </div>
      <div>
        <dt className="text-muted-foreground">Created</dt>
        <dd>{new Date(business.createdAt).toLocaleString()}</dd>
      </div>
    </dl>
  );
}
