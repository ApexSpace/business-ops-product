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
import {
  CONTACTS_DRAWER_PROFILE_BODY_CLASS,
  CONTACTS_DRAWER_PROFILE_FOOTER_CLASS,
  CONTACTS_DRAWER_PROFILE_SCROLL_CLASS,
  CONTACTS_DRAWER_FOOTER_INNER_CLASS,
} from "@/features/contacts/styles/contacts-drawer-tokens";

interface ContactProfileEditFormProps {
  contact: Contact;
  onCancel: () => void;
  onSuccess: () => void;
  className?: string;
  /** Narrow left column in Client Details split drawer. */
  layout?: "default" | "drawer-pane";
}

/** In-place contact profile editor (drawer left column or page sidebar). */
export function ContactProfileEditForm({
  contact,
  onCancel,
  onSuccess,
  className,
  layout = "default",
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
  const isDrawerPane = layout === "drawer-pane";

  return (
    <div
      className={cn(
        "flex min-h-0 flex-col overflow-hidden",
        isDrawerPane ? "h-full" : "flex-1",
        className,
      )}
    >
      <Form {...form}>
        <form
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={(e) => void submit(e)}
        >
          {isDrawerPane ? (
            <>
              <div className={CONTACTS_DRAWER_PROFILE_SCROLL_CLASS}>
                <div
                  className={cn(
                    CONTACTS_DRAWER_PROFILE_BODY_CLASS,
                    "contacts-drawer-profile-panel__body--edit",
                  )}
                >
                  <ContactFormFields
                    form={form}
                    layout={layout}
                    avatarPreviewUrl={
                      contact.avatarAssetId ? undefined : contact.avatarUrl
                    }
                  />
                </div>
              </div>
              <div className={CONTACTS_DRAWER_PROFILE_FOOTER_CLASS}>
                <div className={CONTACTS_DRAWER_FOOTER_INNER_CLASS}>
                  <div className="grid w-full grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="min-w-0"
                      disabled={mutation.isPending}
                      onClick={onCancel}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="brand"
                      size="sm"
                      className="min-w-0"
                      disabled={mutation.isPending}
                    >
                      {mutation.isPending ? "Saving…" : "Save"}
                    </Button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin">
                <ContactFormFields
                  form={form}
                  layout={layout}
                  avatarPreviewUrl={
                    contact.avatarAssetId ? undefined : contact.avatarUrl
                  }
                />
              </div>
              <div className="mt-4 flex shrink-0 flex-col gap-2 border-t border-border pt-4 sm:flex-row">
                <Button
                  type="button"
                  variant="outline"
                  className="min-w-0 flex-1"
                  disabled={mutation.isPending}
                  onClick={onCancel}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="brand"
                  className="min-w-0 flex-1"
                  disabled={mutation.isPending}
                >
                  {mutation.isPending ? "Saving…" : "Save"}
                </Button>
              </div>
            </>
          )}
        </form>
      </Form>
    </div>
  );
}
