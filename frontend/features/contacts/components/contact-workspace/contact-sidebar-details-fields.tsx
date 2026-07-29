"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { updateContact } from "@/features/contacts/api/contacts.api";
import type { Contact } from "@/features/contacts/types";
import { invalidateContactDetail } from "@/lib/query/invalidation";
import { cn } from "@/lib/utils";

export const CONTACT_FIELD_LABEL_CLASS =
  "text-xs font-medium uppercase tracking-wide text-muted-foreground";

interface ContactDetailFieldProps {
  label: string;
  value: string | null | undefined;
  labelClassName?: string;
  emptyActionLabel?: string;
  onEmptyAction?: () => void;
  hrefPrefix?: "tel" | "mailto";
}

function ContactDetailField({
  label,
  value,
  labelClassName,
  emptyActionLabel,
  onEmptyAction,
  hrefPrefix,
}: ContactDetailFieldProps) {
  const trimmed = value?.trim() ?? "";

  return (
    <div className="space-y-1">
      <span className={cn("block", labelClassName ?? CONTACT_FIELD_LABEL_CLASS)}>
        {label}
      </span>
      {trimmed ? (
        hrefPrefix ? (
          <a
            href={`${hrefPrefix}:${trimmed}`}
            className={cn(
              "text-sm font-medium text-foreground hover:underline",
              hrefPrefix === "mailto" && "break-all",
            )}
          >
            {trimmed}
          </a>
        ) : (
          <p className="text-sm font-medium text-foreground">{trimmed}</p>
        )
      ) : onEmptyAction && emptyActionLabel ? (
        <button
          type="button"
          className="text-sm text-primary hover:underline"
          onClick={onEmptyAction}
        >
          {emptyActionLabel}
        </button>
      ) : (
        <p className="text-sm text-muted-foreground">—</p>
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
  onRequestEdit,
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
  onRequestEdit?: () => void;
  className?: string;
  fieldLabelClassName?: string;
  notesTextareaClassName?: string;
}) {
  const labelClass = fieldLabelClassName ?? CONTACT_FIELD_LABEL_CLASS;

  return (
    <div className={cn("space-y-4", className)}>
      {showPhone ? (
        <ContactDetailField
          label="Phone"
          value={contact.phone}
          labelClassName={labelClass}
          emptyActionLabel="+ Add phone"
          onEmptyAction={onRequestEdit}
          hrefPrefix="tel"
        />
      ) : null}
      {showEmail ? (
        <ContactDetailField
          label="Email"
          value={contact.email}
          labelClassName={labelClass}
          emptyActionLabel="+ Add email"
          onEmptyAction={onRequestEdit}
          hrefPrefix="mailto"
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
