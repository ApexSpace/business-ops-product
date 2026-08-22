"use client";

import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PhoneInput } from "@/components/forms/phone-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { updateContact } from "@/features/contacts/api/contacts.api";
import type { Contact } from "@/features/contacts/types";
import {
  apiPhoneToFormValue,
  phoneToApiFields,
} from "@/lib/forms/phone";
import { invalidateContactDetail } from "@/lib/query/invalidation";
import { cn } from "@/lib/utils";

export const CONTACT_FIELD_LABEL_CLASS =
  "text-xs font-medium uppercase tracking-wide text-muted-foreground";

interface ContactDetailFieldProps {
  label: string;
  value: string | null | undefined;
  labelClassName?: string;
}

function ContactDetailField({
  label,
  value,
  labelClassName,
}: ContactDetailFieldProps) {
  const trimmed = value?.trim() ?? "";

  return (
    <div className="space-y-1">
      <span className={cn("block", labelClassName ?? CONTACT_FIELD_LABEL_CLASS)}>
        {label}
      </span>
      {trimmed ? (
        <p className="text-sm font-medium text-foreground">{trimmed}</p>
      ) : (
        <p className="text-sm text-muted-foreground">—</p>
      )}
    </div>
  );
}

export type ContactInlineEditableKind = "phone" | "email";

export function ContactInlineEditableField({
  contact,
  kind,
  label: labelOverride,
  labelClassName,
  className,
  valueClassName,
}: {
  contact: Contact;
  kind: ContactInlineEditableKind;
  /** Override default label (e.g. Figma "Phone Number"). */
  label?: string;
  labelClassName?: string;
  className?: string;
  valueClassName?: string;
}) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  const label =
    labelOverride ?? (kind === "phone" ? "Phone Number" : "Email");
  const displayValue =
    kind === "phone"
      ? (contact.phone?.trim() ?? "")
      : (contact.email?.trim() ?? "");
  const emptyActionLabel =
    kind === "phone" ? "+ Add phone" : "+ Add email";

  const initialPhone = apiPhoneToFormValue(
    contact.phone,
    contact.phoneCountryCode,
    contact.phoneNumber,
  );
  const initialEmail = contact.email?.trim() ?? "";
  const initialDraft = kind === "phone" ? initialPhone : initialEmail;

  useEffect(() => {
    setEditing(false);
    setDraft("");
  }, [contact.id]);

  const mutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      updateContact(contact.id, body),
    onSuccess: () => {
      void invalidateContactDetail(queryClient, contact.id);
      setEditing(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function startEditing() {
    setDraft(initialDraft);
    setEditing(true);
  }

  function cancelEditing() {
    setDraft(initialDraft);
    setEditing(false);
  }

  function handleSave() {
    if (kind === "phone") {
      const phoneFields = phoneToApiFields(draft);
      const unchanged =
        (phoneFields.phoneCountryCode ?? null) ===
          (contact.phoneCountryCode ?? null) &&
        (phoneFields.phoneNumber ?? null) === (contact.phoneNumber ?? null);
      if (unchanged) {
        setEditing(false);
        return;
      }
      mutation.mutate(phoneFields);
      return;
    }

    const nextEmail = draft.trim();
    if (nextEmail === initialEmail) {
      setEditing(false);
      return;
    }
    mutation.mutate({ email: nextEmail || null });
  }

  const labelClass = labelClassName ?? CONTACT_FIELD_LABEL_CLASS;

  return (
    <div className={cn("space-y-1", className)}>
      <span className={cn("block", labelClass)}>{label}</span>

      {editing ? (
        <div className="space-y-2">
          {kind === "phone" ? (
            <PhoneInput
              value={draft || null}
              onChange={(value) => setDraft(value ?? "")}
              disabled={mutation.isPending}
              showClear
            />
          ) : (
            <Input
              type="email"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="email@example.com"
              disabled={mutation.isPending}
              className="break-all"
              autoFocus
            />
          )}
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={mutation.isPending}
            >
              {mutation.isPending ? "Saving…" : "Save"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={cancelEditing}
              disabled={mutation.isPending}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : displayValue ? (
        <button
          type="button"
          onClick={startEditing}
          className={cn(
            "block w-full text-left text-sm font-medium text-foreground hover:underline",
            kind === "email" && "break-all",
            valueClassName,
          )}
        >
          {displayValue}
        </button>
      ) : (
        <button
          type="button"
          className={cn(
            "text-sm text-violet-primary-normal hover:underline",
            valueClassName,
          )}
          onClick={startEditing}
        >
          {emptyActionLabel}
        </button>
      )}
    </div>
  );
}

function ClientNotesField({
  contactId,
  initialNotes,
  labelClassName,
  textareaClassName,
}: {
  contactId: string;
  initialNotes: string;
  labelClassName?: string;
  textareaClassName?: string;
}) {
  const queryClient = useQueryClient();

  const saveNotesMutation = useMutation({
    mutationFn: (notes: string) =>
      updateContact(contactId, { clientNotes: notes }),
    onSuccess: () => {
      void invalidateContactDetail(queryClient, contactId);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="space-y-1">
      <span className={cn("block", labelClassName ?? CONTACT_FIELD_LABEL_CLASS)}>
        Client notes
      </span>
      <Textarea
        key={`${contactId}:${initialNotes}`}
        defaultValue={initialNotes}
        onBlur={(e) => {
          const trimmed = e.target.value.trim();
          if (trimmed !== initialNotes.trim()) {
            saveNotesMutation.mutate(trimmed);
          }
        }}
        placeholder="Add client notes…"
        rows={3}
        className={cn(
          "min-h-[72px] !min-h-[72px] max-h-40 resize-y text-sm focus:min-h-[96px]",
          textareaClassName,
        )}
      />
    </div>
  );
}

export function ContactSidebarDetailsFields({
  contact,
  showPhone = true,
  showEmail = true,
  showNotes = true,
  showCreated = false,
  createdAt,
  className,
  fieldLabelClassName,
  notesTextareaClassName,
}: {
  contact: Contact;
  showPhone?: boolean;
  showEmail?: boolean;
  showNotes?: boolean;
  showCreated?: boolean;
  createdAt?: string;
  /** @deprecated Phone/email use inline edit; kept for call-site compatibility. */
  onRequestEdit?: () => void;
  className?: string;
  fieldLabelClassName?: string;
  notesTextareaClassName?: string;
}) {
  const labelClass = fieldLabelClassName ?? CONTACT_FIELD_LABEL_CLASS;

  return (
    <div className={cn("space-y-4", className)}>
      {showPhone ? (
        <ContactInlineEditableField
          contact={contact}
          kind="phone"
          labelClassName={labelClass}
        />
      ) : null}
      {showEmail ? (
        <ContactInlineEditableField
          contact={contact}
          kind="email"
          labelClassName={labelClass}
        />
      ) : null}
      {showCreated && createdAt ? (
        <ContactDetailField
          label="Created"
          value={createdAt}
          labelClassName={labelClass}
        />
      ) : null}
      {showNotes ? (
        <ClientNotesField
          contactId={contact.id}
          initialNotes={contact.clientNotes ?? ""}
          labelClassName={labelClass}
          textareaClassName={notesTextareaClassName}
        />
      ) : null}
    </div>
  );
}
