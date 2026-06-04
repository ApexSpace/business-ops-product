"use client";

import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Trash2,
  Users,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ActionButton } from "@/components/ui/action-button";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  formatContactAddress,
  formatContactCreatedAt,
  getContactAssigneeFromLeads,
  WORKSPACE_PANEL_CLASS,
} from "@/features/contacts/workspace/contact-workspace";
import type { Contact, Lead } from "@/features/contacts/types";

interface ContactDetailsPanelProps {
  contact: Contact;
  leads: Lead[];
  contactIndex?: number;
  contactTotal?: number;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
  className?: string;
}

const fieldBoxClass =
  "h-9 resize-none border-border/80 bg-muted/25 text-sm text-foreground shadow-none read-only:cursor-default disabled:opacity-100";

const fieldTextareaClass =
  "min-h-[72px] resize-none border-border/80 bg-muted/25 text-sm text-foreground shadow-none read-only:cursor-default disabled:opacity-100";

interface DetailFieldProps {
  label: string;
  value: string | null | undefined;
  multiline?: boolean;
  placeholder?: string;
}

function DetailField({
  label,
  value,
  multiline = false,
  placeholder = "—",
}: DetailFieldProps) {
  const display = value?.trim() ? value.trim() : "";

  return (
    <div className="space-y-1.5">
      <span className="block text-xs font-medium text-muted-foreground">
        {label}
      </span>
      {multiline ? (
        <Textarea
          readOnly
          disabled
          value={display}
          placeholder={placeholder}
          rows={3}
          className={fieldTextareaClass}
        />
      ) : (
        <Input
          readOnly
          disabled
          value={display}
          placeholder={placeholder}
          className={fieldBoxClass}
        />
      )}
    </div>
  );
}

interface FieldDef {
  label: string;
  value: string | null | undefined;
  multiline?: boolean;
}

export function ContactDetailsPanel({
  contact,
  leads,
  contactIndex,
  contactTotal,
  onBack,
  onEdit,
  onDelete,
  className,
}: ContactDetailsPanelProps) {
  const assignee = getContactAssigneeFromLeads(leads);
  const address = formatContactAddress(contact);
  const legalName = [contact.firstName, contact.lastName]
    .filter(Boolean)
    .join(" ");

  const contactInfoFields: FieldDef[] = [
    { label: "Email", value: contact.email },
    { label: "Phone", value: contact.phone },
    { label: "Company", value: contact.companyName },
    { label: "Address", value: address, multiline: true },
    { label: "Timezone", value: contact.timezone },
    { label: "Source", value: contact.source },
    {
      label: "Created",
      value: formatContactCreatedAt(contact.createdAt),
    },
    { label: "Owner", value: assignee ?? "Unassigned" },
  ];

  const additionalFields: FieldDef[] = [
    { label: "First name", value: contact.firstName },
    { label: "Last name", value: contact.lastName },
    { label: "Legal name", value: legalName || null },
    { label: "Display name", value: contact.displayName },
  ];

  return (
    <aside className={cn(WORKSPACE_PANEL_CLASS, className)}>
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border/60 px-3 py-2">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1 px-2"
          onClick={onBack}
        >
          <ArrowLeft className="size-4" />
          Back
        </Button>
        {contactTotal != null && contactTotal > 0 ? (
          <div className="flex items-center gap-0.5 text-xs text-muted-foreground">
            <IconButton aria-label="Previous contact" className="size-7" disabled>
              <ChevronLeft className="size-4" />
            </IconButton>
            <span className="tabular-nums">
              {contactIndex != null ? contactIndex + 1 : "—"} / {contactTotal}
            </span>
            <IconButton aria-label="Next contact" className="size-7" disabled>
              <ChevronRight className="size-4" />
            </IconButton>
          </div>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
        <div className="border-b border-border/60 px-4 py-4">
          <div className="flex items-start gap-3">
            <Avatar className="size-14 shrink-0">
              {contact.avatarUrl ? (
                <AvatarImage src={contact.avatarUrl} alt="" />
              ) : null}
              <AvatarFallback className="text-base">
                {contact.label.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-base font-semibold">{contact.label}</h2>
              <div className="mt-2 flex gap-1">
                <IconButton aria-label="Edit contact" onClick={onEdit}>
                  <Pencil className="size-4" />
                </IconButton>
                <IconButton
                  aria-label="Delete contact"
                  className="text-destructive hover:text-destructive"
                  onClick={onDelete}
                >
                  <Trash2 className="size-4" />
                </IconButton>
              </div>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <Users className="size-3.5 shrink-0" />
            <span>Followers — coming soon</span>
          </div>

          {contact.tags.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-1">
              {contact.tags.map((tag) => (
                <Badge key={tag.id} variant="secondary" className="text-xs">
                  {tag.name}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-xs text-muted-foreground">No tags</p>
          )}
        </div>

        <section className="space-y-3 px-4 pb-4 pt-1">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Contact info
          </h3>
          {contactInfoFields.map((f) => (
            <DetailField
              key={f.label}
              label={f.label}
              value={f.value}
              multiline={f.multiline}
            />
          ))}
        </section>

        <Separator />

        <section className="space-y-3 px-4 py-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Additional details
          </h3>
          {additionalFields.map((f) => (
            <DetailField key={f.label} label={f.label} value={f.value} />
          ))}

          <DetailField
            label="Followers"
            value={null}
            placeholder="Coming soon"
          />
        </section>

        <Separator />

        <section className="space-y-3 px-4 py-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Notes
            </h3>
            <Button size="sm" variant="ghost" className="h-7 text-xs" disabled>
              Save
            </Button>
          </div>
          <DetailField label="Contact notes" value={null} multiline placeholder="Coming soon — save notes on the contact record" />
          <p className="text-xs text-muted-foreground">
            Lead notes appear in the records panel.
          </p>
        </section>
      </div>

      <div className="shrink-0 border-t border-border/60 p-3">
        <ActionButton className="w-full" variant="secondary" onClick={onEdit}>
          <Pencil className="mr-1.5 size-4" />
          Edit contact
        </ActionButton>
      </div>
    </aside>
  );
}
