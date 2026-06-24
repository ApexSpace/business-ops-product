"use client";

import { useQuery } from "@tanstack/react-query";
import { getContactMemberships } from "@/features/contacts/api/contact-workspace.api";
import { ContactRecordsSectionPlaceholder } from "@/features/contacts/workspace/records/contact-records-placeholder";
import { RecordListEmpty } from "@/features/contacts/components/contact-workspace/contact-record-section";
import { queryKeys } from "@/lib/query/keys";
import type { ContactRecordsSectionProps } from "@/features/contacts/workspace/records/contact-records-types";

export function ContactRecordsMembershipsSection({ contact }: ContactRecordsSectionProps) {
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.contacts.memberships(contact.id),
    queryFn: () => getContactMemberships(contact.id),
  });

  if (isLoading) return <RecordListEmpty message="Loading memberships…" />;

  if (!data?.available) {
    return (
      <ContactRecordsSectionPlaceholder
        title="Memberships & packages"
        description={
          data?.message ??
          "Recurring memberships and prepaid packages coming soon. This section will show active plans and remaining services."
        }
      />
    );
  }

  return (
    <ContactRecordsSectionPlaceholder
      title="No memberships yet"
      description="This client has no active memberships or packages."
    />
  );
}
