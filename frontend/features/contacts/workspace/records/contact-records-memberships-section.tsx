"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { DateTime } from "luxon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getContactMemberships } from "@/features/contacts/api/contact-workspace.api";
import { useMembershipStaffPermissions } from "@/features/memberships/hooks/use-membership-staff-permissions";
import { usePackageStaffPermissions } from "@/features/packages/hooks/use-package-staff-permissions";
import { ContactRecordsSectionPlaceholder } from "@/features/contacts/workspace/records/contact-records-placeholder";
import { RecordListEmpty } from "@/features/contacts/components/contact-workspace/contact-record-section";
import { queryKeys } from "@/lib/query/keys";
import type { ContactRecordsSectionProps } from "@/features/contacts/workspace/records/contact-records-types";
import type { ClientMembershipListItem } from "@/features/memberships/types";
import type { ClientPackageListItem } from "@/features/packages/types";

function packageLabel(pkg: ClientPackageListItem) {
  return `${pkg.packageTemplate.emoji ?? ""} ${pkg.packageTemplate.name}`.trim();
}

function membershipLabel(membership: ClientMembershipListItem) {
  return `${membership.plan.emoji ?? ""} ${membership.plan.name}`.trim();
}

function membershipBadgeVariant(status: ClientMembershipListItem["status"]) {
  switch (status) {
    case "ACTIVE":
    case "SCHEDULED":
      return "default";
    case "PAST_DUE":
    case "UNPAID":
      return "destructive";
    default:
      return "secondary";
  }
}

export function ContactRecordsMembershipsSection({
  contact,
}: ContactRecordsSectionProps) {
  const { canManage: canManageMemberships } = useMembershipStaffPermissions();
  const { canManage: canManagePackages } = usePackageStaffPermissions();
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.contacts.memberships(contact.id),
    queryFn: () => getContactMemberships(contact.id),
  });

  if (isLoading) return <RecordListEmpty message="Loading memberships…" />;

  const memberships = data?.memberships ?? [];
  const packages = (data?.packages ?? []) as ClientPackageListItem[];

  if (!data?.available && memberships.length === 0 && packages.length === 0) {
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
        <h3 className="text-[15px] font-semibold">Memberships</h3>
        {canManageMemberships ? (
          <Button
            size="sm"
            variant="outline"
            className="rounded-[10px] border-border/70"
            nativeButton={false}
            render={
              <Link href={`/business/memberships?contact=${contact.id}`} />
            }
          >
            Add membership
          </Button>
        ) : null}
      </div>

      {memberships.length === 0 ? (
        <ContactRecordsSectionPlaceholder
          title="No memberships yet"
          description="This client has no active or scheduled memberships."
        />
      ) : (
        <div className="space-y-3">
          {memberships.map((membership) => (
            <Link
              key={membership.id}
              href={`/business/memberships?selected=${membership.id}`}
              className="block rounded-[12px] border border-border/70 bg-background/80 p-4 transition-colors hover:bg-muted/25"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{membershipLabel(membership)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Started{" "}
                    {DateTime.fromISO(membership.startDate).toFormat(
                      "MMMM d, yyyy",
                    )}
                    {membership.nextBillingDate
                      ? ` · Next billing ${DateTime.fromISO(
                          membership.nextBillingDate,
                        ).toFormat("MMM d")}`
                      : ""}
                  </p>
                </div>
                <Badge variant={membershipBadgeVariant(membership.status)}>
                  {membership.status.replace(/_/g, " ")}
                </Badge>
              </div>
            </Link>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[15px] font-semibold">Packages</h3>
        {canManagePackages ? (
          <Button
            size="sm"
            variant="outline"
            className="rounded-[10px] border-border/70"
            nativeButton={false}
            render={<Link href={`/business/packages?contact=${contact.id}`} />}
          >
            Add package
          </Button>
        ) : null}
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
              className="block rounded-[12px] border border-border/70 bg-background/80 p-4 transition-colors hover:bg-muted/25"
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
