"use client";

import {
  formatContactAddress,
  formatContactCreatedAt,
  getContactAssigneeFromLeads,
} from "@/features/contacts/workspace/contact-workspace";
import type { Contact, Lead } from "@/features/contacts/types";

interface DetailFieldProps {
  label: string;
  value: string | null | undefined;
}

function SidebarDetailField({ label, value }: DetailFieldProps) {
  const display = value?.trim() ? value.trim() : "—";

  return (
    <div className="space-y-0.5">
      <span className="block text-[11px] font-medium text-muted-foreground">
        {label}
      </span>
      <p className="text-sm text-foreground">{display}</p>
    </div>
  );
}

export function ContactSidebarDetailsFields({
  contact,
  leads,
}: {
  contact: Contact;
  leads: Lead[];
}) {
  const assignee = getContactAssigneeFromLeads(leads);
  const address = formatContactAddress(contact);

  return (
    <div className="space-y-3">
      <SidebarDetailField label="Email" value={contact.email} />
      <SidebarDetailField label="Phone" value={contact.phone} />
      <SidebarDetailField label="Company" value={contact.companyName} />
      <SidebarDetailField label="Address" value={address} />
      <SidebarDetailField label="Timezone" value={contact.timezone} />
      <SidebarDetailField label="Source" value={contact.source} />
      <SidebarDetailField
        label="Created"
        value={formatContactCreatedAt(contact.createdAt)}
      />
      <SidebarDetailField label="Owner" value={assignee ?? "Unassigned"} />
    </div>
  );
}
