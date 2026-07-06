"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Clock } from "lucide-react";
import { toast } from "sonner";
import { ContactFormFields } from "@/features/contacts/components/contact-form-fields";
import {
  DRAWER_FOOTER_ACTIONS_CLASS,
  DRAWER_FOOTER_BUTTON_CLASS,
  DRAWER_SHEET_CLASS,
  DRAWER_SHEET_CONTENT_CLASS,
  DRAWER_SHEET_DESCRIPTION_CLASS,
  DRAWER_SHEET_FOOTER_CLASS,
  DRAWER_SHEET_HEADER_CLASS,
  DRAWER_SHEET_TITLE_CLASS,
} from "@/components/forms/drawer-sheet";
import { queryKeys } from "@/lib/query/keys";
import { FormSheet } from "@/components/forms/form-sheet";
import { ActionButton } from "@/components/ui/action-button";
import { createContact, updateContact } from "@/features/contacts/api/contacts.api";
import { mapApiFieldErrorsToForm } from "@/lib/forms/map-api-field-errors";
import { ApiClientError } from "@/lib/api/errors";
import {
  contactProfileDefaultValues,
  contactProfileSchema,
  contactToProfileForm,
  profileFormToApiBody,
  type ContactProfileFormValues,
} from "@/features/contacts/schemas/contact-profile";
import type { Contact } from "@/features/contacts/types";

interface ContactFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact?: Contact | null;
  onSuccess: () => void;
}

export function ContactFormDialog({
  open,
  onOpenChange,
  contact,
  onSuccess,
}: ContactFormDialogProps) {
  const queryClient = useQueryClient();
  const isEdit = !!contact;

  const form = useForm<ContactProfileFormValues>({
    resolver: zodResolver(contactProfileSchema),
    defaultValues: contactProfileDefaultValues,
  });

  useEffect(() => {
    if (open && contact) {
      form.reset(contactToProfileForm(contact));
    } else if (open) {
      form.reset(contactProfileDefaultValues);
    }
  }, [contact, form, open]);

  const mutation = useMutation({
    mutationFn: (values: ContactProfileFormValues) => {
      const body = profileFormToApiBody(values);
      if (isEdit && contact) {
        return updateContact(contact.id, body);
      }
      return createContact(body);
    },
    onSuccess: (_data, values) => {
      const nextAssetId = values.avatarAssetId?.trim() || "";
      if (nextAssetId) {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.storage.file(nextAssetId),
        });
      }
      if (contact?.avatarAssetId && contact.avatarAssetId !== nextAssetId) {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.storage.file(contact.avatarAssetId),
        });
      }
      toast.success(isEdit ? "Contact updated" : "Contact created");
      onSuccess();
      onOpenChange(false);
    },
    onError: (err: Error) => {
      if (!mapApiFieldErrorsToForm(err, form.setError)) {
        const hint =
          err instanceof ApiClientError && err.requestId
            ? `${err.message} (${err.requestId})`
            : err.message;
        toast.error(hint);
      }
    },
  });

  const submit = form.handleSubmit((values) => mutation.mutate(values));

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? "Edit contact" : "New contact"}
      description={
        isEdit
          ? "Update contact details and profile information."
          : "Add a new contact to your workspace."
      }
      className={DRAWER_SHEET_CLASS}
      headerClassName={DRAWER_SHEET_HEADER_CLASS}
      titleClassName={DRAWER_SHEET_TITLE_CLASS}
      descriptionClassName={DRAWER_SHEET_DESCRIPTION_CLASS}
      contentClassName={DRAWER_SHEET_CONTENT_CLASS}
      footerClassName={DRAWER_SHEET_FOOTER_CLASS}
      form={form}
      schema={contactProfileSchema}
      onSubmit={(v) => mutation.mutate(v)}
      isPending={mutation.isPending}
      submitLabel={isEdit ? "Save changes" : "Create contact"}
      footer={
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
          <p className="flex items-center gap-2 text-xs text-muted-foreground sm:mr-auto">
            <Clock className="size-3.5 shrink-0" aria-hidden />
            {isEdit
              ? "Changes apply when you save this contact"
              : "New contacts appear in your master list right away"}
          </p>
          <div className={DRAWER_FOOTER_ACTIONS_CLASS}>
            <ActionButton
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={mutation.isPending}
              className={DRAWER_FOOTER_BUTTON_CLASS}
            >
              Cancel
            </ActionButton>
            <ActionButton
              type="button"
              disabled={mutation.isPending}
              onClick={() => void submit()}
              className={DRAWER_FOOTER_BUTTON_CLASS}
            >
              {mutation.isPending ? (
                "Saving…"
              ) : (
                <>
                  <Check className="size-4" />
                  {isEdit ? "Save changes" : "Create contact"}
                </>
              )}
            </ActionButton>
          </div>
        </div>
      }
    >
      <ContactFormFields
        form={form}
        avatarPreviewUrl={
          contact && !contact.avatarAssetId ? contact.avatarUrl : undefined
        }
      />
    </FormSheet>
  );
}
