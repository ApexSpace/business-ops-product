"use client";

import { ContactEstimatesPanel } from "@/features/contacts/components/contact-workspace/contact-estimates-panel";
import { ContactInvoicesPanel } from "@/features/contacts/components/contact-workspace/contact-invoices-panel";
import { ContactPaymentsPanel } from "@/features/contacts/components/contact-workspace/contact-payments-panel";
import {
  isPlaceholderSection,
  type ContactRecordsSectionId,
} from "@/features/contacts/workspace/contact-workspace";
import { ContactRecordsSectionPlaceholder } from "@/features/contacts/workspace/records/contact-records-placeholder";
import { ContactRecordsLeadsSection } from "@/features/contacts/workspace/records/contact-records-leads-section";
import { ContactRecordsWorkItemsSection } from "@/features/contacts/workspace/records/contact-records-work-items-section";
import { ContactRecordsNotesSection } from "@/features/contacts/workspace/records/contact-records-notes-section";
import { ContactRecordsAppointmentsSection } from "@/features/contacts/workspace/records/contact-records-appointments-section";
import { ContactRecordsTasksSection } from "@/features/contacts/workspace/records/contact-records-tasks-section";
import { ContactRecordsActivitySection } from "@/features/contacts/workspace/records/contact-records-activity-section";
import type { ContactRecordsSectionProps } from "@/features/contacts/workspace/records/contact-records-types";
import type { IndustryLabels } from "@/features/contacts/types";

interface ContactRecordsSectionBodyProps extends ContactRecordsSectionProps {
  activeSection: ContactRecordsSectionId;
  labels: IndustryLabels;
}

function SectionPlaceholder({ description }: { description: string }) {
  return (
    <ContactRecordsSectionPlaceholder
      title="Coming soon"
      description={description}
    />
  );
}

export function ContactRecordsSectionBody({
  activeSection,
  labels,
  ...sectionProps
}: ContactRecordsSectionBodyProps) {
  const props = { labels, ...sectionProps };
  const { contact } = props;

  if (isPlaceholderSection(activeSection)) {
    const descriptions: Record<string, string> = {
      appointments: `${labels.appointments} scheduling will appear here.`,
      automations: "Workflows and AI automations are on the roadmap.",
    };
    return (
      <SectionPlaceholder
        description={
          descriptions[activeSection] ?? "This module is coming soon."
        }
      />
    );
  }

  switch (activeSection) {
    case "leads":
      return <ContactRecordsLeadsSection {...props} />;
    case "work-items":
      return <ContactRecordsWorkItemsSection {...props} />;
    case "notes":
      return <ContactRecordsNotesSection {...props} />;
    case "appointments":
      return <ContactRecordsAppointmentsSection {...props} />;
    case "tasks":
      return <ContactRecordsTasksSection {...props} />;
    case "activity":
      return <ContactRecordsActivitySection {...props} />;
    case "estimates":
      return (
        <ContactEstimatesPanel
          contactId={contact.id}
          contactLabel={contact.label}
          estimates={props.estimates ?? []}
          isLoading={props.financialLoading ?? false}
        />
      );
    case "invoices":
      return (
        <ContactInvoicesPanel
          contactId={contact.id}
          contactLabel={contact.label}
          invoices={props.invoices ?? []}
          isLoading={props.financialLoading ?? false}
        />
      );
    case "payments":
      return (
        <ContactPaymentsPanel
          payments={props.payments ?? []}
          isLoading={props.financialLoading ?? false}
        />
      );
    default:
      return null;
  }
}
