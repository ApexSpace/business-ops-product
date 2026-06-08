"use client";

import type { UseFormReturn } from "react-hook-form";
import { PhoneField } from "@/components/forms/phone-field";
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
import { BusinessProfileSectionTitle } from "@/features/platform/components/business-profile-section-title";
import type { BusinessProfileFormValues } from "@/features/settings/schemas/business-profile";

export function BusinessProfileContactFields({
  form,
  disabled,
  showSectionTitle,
  twoColumnLayout = false,
}: {
  form: UseFormReturn<BusinessProfileFormValues>;
  disabled: boolean;
  showSectionTitle: boolean;
  twoColumnLayout?: boolean;
}) {
  return (
    <section className="space-y-4">
      {showSectionTitle ? (
        <BusinessProfileSectionTitle>Primary contact</BusinessProfileSectionTitle>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          control={form.control}
          name="firstName"
          label="First name"
          placeholder="Jane"
          disabled={disabled}
        />
        <TextField
          control={form.control}
          name="lastName"
          label="Last name"
          placeholder="Smith"
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
      {twoColumnLayout ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <PhoneField control={form.control} name="phone" disabled={disabled} />
          <TextField
            control={form.control}
            name="email"
            label="Email"
            type="email"
            placeholder="jane@example.com"
            disabled={disabled}
          />
        </div>
      ) : (
        <>
          <TextField
            control={form.control}
            name="email"
            label="Email"
            type="email"
            placeholder="jane@example.com"
            disabled={disabled}
          />
          <PhoneField control={form.control} name="phone" disabled={disabled} />
        </>
      )}
    </section>
  );
}
