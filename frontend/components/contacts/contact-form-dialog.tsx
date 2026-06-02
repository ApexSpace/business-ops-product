"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { ContactFormFields } from "@/components/contacts/contact-form-fields";
import { FormDialog } from "@/components/forms/form-dialog";
import { apiClient } from "@/lib/api-client";
import {
  contactProfileDefaultValues,
  contactProfileSchema,
  contactToProfileForm,
  profileFormToApiBody,
  type ContactProfileFormValues,
} from "@/lib/contact-profile";
import type { Contact } from "@/types/api";

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
        return apiClient<Contact>(`contacts/${contact.id}`, {
          method: "PATCH",
          body,
        });
      }
      return apiClient<Contact>("contacts", {
        method: "POST",
        body,
      });
    },
    onSuccess: () => {
      toast.success(isEdit ? "Contact updated" : "Contact created");
      onSuccess();
      onOpenChange(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? "Edit contact" : "New contact"}
      form={form}
      schema={contactProfileSchema}
      onSubmit={(v) => mutation.mutate(v)}
      isPending={mutation.isPending}
      submitLabel={isEdit ? "Save changes" : "Create contact"}
      className="sm:max-w-2xl"
    >
      <ContactFormFields form={form} />
    </FormDialog>
  );
}
