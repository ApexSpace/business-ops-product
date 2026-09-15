"use client";

import { useEffect } from "react";
import { IdCard, Mail, MapPin, UserRound } from "lucide-react";
import type { UseFormReturn } from "react-hook-form";
import { AvatarUploadField } from "@/components/forms/avatar-upload-field";
import { FormDrawerSection } from "@/components/forms/form-drawer-section";
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
import {
  CONTACTS_DRAWER_PROFILE_EDIT_FIELD_GRID_CLASS,
  CONTACTS_DRAWER_PROFILE_EDIT_FIELDS_CLASS,
} from "@/features/contacts/styles/contacts-drawer-tokens";
import { countryOptions, timezoneOptions } from "@/lib/config/geo-options";
import { cn } from "@/lib/utils";

export interface ContactFormFieldsProps {
  form: UseFormReturn<ContactProfileFormValues>;
  disabled?: boolean;
  avatarPreviewUrl?: string | null;
  /** Single-column stack for narrow Client Details left pane. */
  layout?: "default" | "drawer-pane";
}

export function ContactFormFields({
  form,
  disabled = false,
  avatarPreviewUrl,
  layout = "default",
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

  const nameForInitials =
    displayName?.trim() || buildDisplayName(firstName, lastName) || "Contact";

  const isDrawerPane = layout === "drawer-pane";

  return (
    <div
      className={cn(
        "space-y-4",
        isDrawerPane && CONTACTS_DRAWER_PROFILE_EDIT_FIELDS_CLASS,
      )}
    >
      <FormDrawerSection icon={UserRound} title="Profile picture">
        <AvatarUploadField
          control={form.control}
          name="avatarAssetId"
          disabled={disabled}
          fallbackPreviewUrl={avatarPreviewUrl}
          layout={isDrawerPane ? "inline" : "dropzone"}
          displayName={nameForInitials}
          hideLabel
        />
      </FormDrawerSection>

      <FormDrawerSection icon={IdCard} title="Name">
        <div
          className={cn(
            "grid gap-4",
            isDrawerPane
              ? CONTACTS_DRAWER_PROFILE_EDIT_FIELD_GRID_CLASS
              : "sm:grid-cols-2",
          )}
        >
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
                <Input
                  {...field}
                  readOnly
                  disabled
                  className="border-border/70 bg-muted/50 text-muted-foreground"
                />
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
      </FormDrawerSection>

      <FormDrawerSection icon={Mail} title="Contact details">
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
      </FormDrawerSection>

      <FormDrawerSection icon={MapPin} title="Address">
        <TextField
          control={form.control}
          name="address"
          label="Street address"
          disabled={disabled}
        />
        <div
          className={cn(
            "grid gap-4 sm:grid-cols-2",
            isDrawerPane && CONTACTS_DRAWER_PROFILE_EDIT_FIELD_GRID_CLASS,
          )}
        >
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
        <div
          className={cn(
            "grid gap-4 sm:grid-cols-2",
            isDrawerPane && CONTACTS_DRAWER_PROFILE_EDIT_FIELD_GRID_CLASS,
          )}
        >
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
      </FormDrawerSection>
    </div>
  );
}
