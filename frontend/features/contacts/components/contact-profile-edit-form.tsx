"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ContactFormFields } from "@/features/contacts/components/contact-form-fields";
import { updateContact } from "@/features/contacts/api/contacts.api";
import {
  contactProfileDefaultValues,
  contactProfileSchema,
  contactToProfileForm,
  profileFormToApiBody,
  type ContactProfileFormValues,
} from "@/features/contacts/schemas/contact-profile";
import type { Contact } from "@/features/contacts/types";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { mapApiFieldErrorsToForm } from "@/lib/forms/map-api-field-errors";
import { ApiClientError } from "@/lib/api/errors";
import { queryKeys } from "@/lib/query/keys";
import { cn } from "@/lib/utils";

interface ContactProfileEditFormProps {
  contact: Contact;
  onCancel: () => void;
  onSuccess: () => void;
  className?: string;
}

/** In-place contact profile editor (drawer left column or page sidebar). */
export function ContactProfileEditForm({
  contact,
  onCancel,
  onSuccess,
  className,
}: ContactProfileEditFormProps) {
  const queryClient = useQueryClient();

  const form = useForm<ContactProfileFormValues>({
    resolver: zodResolver(contactProfileSchema),
    defaultValues: contactProfileDefaultValues,
  });

  useEffect(() => {
    form.reset(contactToProfileForm(contact));
  }, [contact, form]);

  const mutation = useMutation({
    mutationFn: (values: ContactProfileFormValues) =>
      updateContact(contact.id, profileFormToApiBody(values)),
    onSuccess: (_data, values) => {
      const nextAssetId = values.avatarAssetId?.trim() || "";
      if (nextAssetId) {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.storage.file(nextAssetId),
        });
      }
      if (contact.avatarAssetId && contact.avatarAssetId !== nextAssetId) {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.storage.file(contact.avatarAssetId),
        });
      }
      toast.success("Contact updated");
      onSuccess();
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
    <div className={cn("flex min-h-0 flex-1 flex-col", className)}>
      <Form {...form}>
        <form
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={(e) => void submit(e)}
        >
          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden pr-0.5 scrollbar-thin">
            <ContactFormFields
              form={form}
              avatarPreviewUrl={
                contact.avatarAssetId ? undefined : contact.avatarUrl
              }
            />
          </div>
          <div className="mt-4 flex shrink-0 flex-col gap-2 border-t border-border pt-4 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              className="min-h-[2.75rem] flex-1"
              disabled={mutation.isPending}
              onClick={onCancel}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="min-h-[2.75rem] flex-1"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? "Saving…" : "Save"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
