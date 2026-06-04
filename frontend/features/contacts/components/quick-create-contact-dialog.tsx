"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { PhoneField } from "@/components/forms/phone-field";
import { FormDialog } from "@/components/forms/form-dialog";
import { TextField } from "@/components/forms/text-field";
import {
  quickContactDefaultValues,
  quickContactFormToApiBody,
  quickContactSchema,
  type QuickContactFormValues,
} from "@/features/contacts/utils/contact-quick-create";
import { buildDisplayName } from "@/features/settings/schemas/business-profile";
import type { Contact } from "@/features/contacts/types";
import { createContact } from "@/features/contacts/api/contacts.api";

interface QuickCreateContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Prefill from search text (name, email, or phone). */
  initialValues?: Partial<QuickContactFormValues>;
  createLabel?: string;
  onCreated: (contact: Contact) => void;
}

export function QuickCreateContactDialog({
  open,
  onOpenChange,
  initialValues,
  createLabel,
  onCreated,
}: QuickCreateContactDialogProps) {
  const form = useForm<QuickContactFormValues>({
    resolver: zodResolver(quickContactSchema),
    defaultValues: quickContactDefaultValues,
  });

  const firstName = form.watch("firstName");
  const lastName = form.watch("lastName");
  const displayName = form.watch("displayName");

  useEffect(() => {
    if (!open) return;
    form.reset({
      ...quickContactDefaultValues,
      ...initialValues,
    });
  }, [open, initialValues, form]);

  useEffect(() => {
    if (!open) return;
    const computed = buildDisplayName(firstName ?? "", lastName ?? "");
    if (computed && computed !== displayName && !displayName?.trim()) {
      form.setValue("displayName", computed, { shouldDirty: true });
    }
  }, [firstName, lastName, displayName, form, open]);

  const mutation = useMutation({
    mutationFn: (values: QuickContactFormValues) =>
      createContact(quickContactFormToApiBody(values)),
    onSuccess: (contact) => {
      toast.success("Contact created");
      onCreated(contact);
      onOpenChange(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const title = createLabel
    ? `Create ${createLabel}`
    : "Create new contact";

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description="Add a customer without leaving this form."
      form={form}
      schema={quickContactSchema}
      onSubmit={(v) => mutation.mutate(v)}
      isPending={mutation.isPending}
      submitLabel="Create contact"
      className="sm:max-w-md"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField control={form.control} name="firstName" label="First name" />
        <TextField control={form.control} name="lastName" label="Last name" />
      </div>
      <TextField
        control={form.control}
        name="displayName"
        label="Display name"
        placeholder="How this contact appears in lists"
      />
      <TextField
        control={form.control}
        name="email"
        label="Email"
        type="email"
        placeholder="name@example.com"
      />
      <PhoneField control={form.control} name="phone" />
    </FormDialog>
  );
}
