"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { DateTime } from "luxon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getContactMemberships } from "@/features/contacts/api/contact-workspace.api";
import { ContactRecordsSectionPlaceholder } from "@/features/contacts/workspace/records/contact-records-placeholder";
import { RecordListEmpty } from "@/features/contacts/components/contact-workspace/contact-record-section";
import { queryKeys } from "@/lib/query/keys";
import type { ContactRecordsSectionProps } from "@/features/contacts/workspace/records/contact-records-types";
import type { ClientPackageListItem } from "@/features/packages/types";

function packageLabel(pkg: ClientPackageListItem) {
  return `${pkg.packageTemplate.emoji ?? ""} ${pkg.packageTemplate.name}`.trim();
}

export function ContactRecordsMembershipsSection({
  contact,
}: ContactRecordsSectionProps) {
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.contacts.memberships(contact.id),
    queryFn: () => getContactMemberships(contact.id),
  });

  if (isLoading) return <RecordListEmpty message="Loading memberships…" />;

  const packages = (data?.packages ?? []) as ClientPackageListItem[];

  if (!data?.available && packages.length === 0) {
    return (
      <ContactRecordsSectionPlaceholder
        title="Memberships & packages"
        description={
          data?.message ??
          "Recurring memberships and prepaid packages coming soon."
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-medium">Packages</h3>
        <Button
          size="sm"
          variant="outline"
          nativeButton={false}
          render={<Link href={`/business/packages?contact=${contact.id}`} />}
        >
          Add package
        </Button>
      </div>

      {packages.length === 0 ? (
        <ContactRecordsSectionPlaceholder
          title="No packages yet"
          description="This client has no active packages."
        />
      ) : (
        <div className="space-y-3">
          {packages.map((pkg) => (
            <Link
              key={pkg.id}
              href={`/business/packages?selected=${pkg.id}`}
              className="block rounded-lg border p-3 transition-colors hover:bg-muted/40"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{packageLabel(pkg)}</p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    Purchased{" "}
                    {DateTime.fromISO(pkg.purchaseDate).toFormat("MMMM d, yyyy")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {pkg.isDemo ? (
                    <Badge variant="secondary">Demo</Badge>
                  ) : null}
                  <Badge variant="outline">{pkg.totalQty} remaining</Badge>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
