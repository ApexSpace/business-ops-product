"use client";

import { useEffect } from "react";
import type { UseFormReturn } from "react-hook-form";
import { AvatarUploadField } from "@/components/forms/avatar-upload-field";
import { PhoneField } from "@/components/forms/phone-field";
import { SelectField } from "@/components/forms/select-field";
import { TextField } from "@/components/forms/text-field";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { buildDisplayName } from "@/features/settings/schemas/business-profile";
import type { ContactProfileFormValues } from "@/features/contacts/schemas/contact-profile";
import { countryOptions, timezoneOptions } from "@/lib/config/geo-options";

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="border-b pb-2 text-sm font-medium text-foreground">
      {children}
    </h3>
  );
}

export interface ContactFormFieldsProps {
  form: UseFormReturn<ContactProfileFormValues>;
  disabled?: boolean;
}

export function ContactFormFields({
  form,
  disabled = false,
}: ContactFormFieldsProps) {
  const firstName = form.watch("firstName");
  const lastName = form.watch("lastName");
  const displayName = form.watch("displayName");

  useEffect(() => {
    const computed = buildDisplayName(firstName, lastName);
    if (computed && computed !== displayName) {
      form.setValue("displayName", computed, { shouldDirty: true });
    }
  }, [firstName, lastName, displayName, form]);

  return (
    <div className="max-h-[min(70vh,640px)] space-y-6 overflow-y-auto pr-1">
      <AvatarUploadField
        control={form.control}
        name="avatarUrl"
        disabled={disabled}
      />

      <section className="space-y-4">
        <SectionTitle>Name</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            control={form.control}
            name="firstName"
            label="First name"
            disabled={disabled}
          />
          <TextField
            control={form.control}
            name="lastName"
            label="Last name"
            disabled={disabled}
          />
        </div>
        <FormField
          control={form.control}
          name="displayName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Display name</FormLabel>
              <FormControl>
                <Input {...field} readOnly disabled className="bg-muted" />
              </FormControl>
              <FormDescription>
                Auto-filled from first and last name.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <TextField
          control={form.control}
          name="companyName"
          label="Company"
          disabled={disabled}
        />
      </section>

      <section className="space-y-4">
        <SectionTitle>Contact details</SectionTitle>
        <TextField
          control={form.control}
          name="email"
          label="Email"
          type="email"
          disabled={disabled}
        />
        <PhoneField
          control={form.control}
          name="phone"
          label="Phone"
          disabled={disabled}
        />
        <SelectField
          control={form.control}
          name="timezone"
          label="Timezone"
          items={timezoneOptions}
          disabled={disabled}
        />
      </section>

      <section className="space-y-4">
        <SectionTitle>Address</SectionTitle>
        <TextField
          control={form.control}
          name="address"
          label="Street address"
          disabled={disabled}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            control={form.control}
            name="city"
            label="City"
            disabled={disabled}
          />
          <TextField
            control={form.control}
            name="state"
            label="State / Province"
            disabled={disabled}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            control={form.control}
            name="country"
            label="Country"
            items={countryOptions}
            placeholder="Select country"
            disabled={disabled}
          />
          <TextField
            control={form.control}
            name="zip"
            label="ZIP / Postal code"
            disabled={disabled}
          />
        </div>
      </section>
    </div>
  );
}
