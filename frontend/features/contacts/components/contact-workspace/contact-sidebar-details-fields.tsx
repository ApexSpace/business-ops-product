"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { updateContact } from "@/features/contacts/api/contacts.api";
import type { Contact } from "@/features/contacts/types";
import { invalidateContactDetail } from "@/lib/query/invalidation";

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

function ClientNotesField({
  contactId,
  initialNotes,
}: {
  contactId: string;
  initialNotes: string;
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
      <span className="block text-[11px] font-medium text-muted-foreground">
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
        className="min-h-[72px] resize-y text-sm"
      />
    </div>
  );
}

export function ContactSidebarDetailsFields({ contact }: { contact: Contact }) {
  return (
    <div className="space-y-3">
      <SidebarDetailField label="Phone" value={contact.phone} />
      <SidebarDetailField label="Email" value={contact.email} />
      <ClientNotesField
        contactId={contact.id}
        initialNotes={contact.clientNotes ?? ""}
      />
    </div>
  );
}
