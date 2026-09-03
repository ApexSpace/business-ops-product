"use client";

import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Copy } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { SettingsChoiceRadioGroup } from "@/components/forms/settings-choice-radio-group";
import { TextField } from "@/components/forms/text-field";
import { SettingsInlineEditSection } from "@/components/layout/settings-inline-edit-section";
import { SettingsViewRows } from "@/components/layout/settings-view-rows";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormSchemaProvider,
} from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import type { ServiceOnlineBookingSettings } from "@/features/services/api/service-workspace.api";
import { DRAWER_SWITCH_CLASS } from "@/lib/design/drawer-tokens";
import { SETTINGS_FORM_DESCRIPTION_CLASS } from "@/lib/design/settings-form-tokens";
import { useSettingsSectionEdit } from "@/lib/settings/use-settings-section-edit";

const onlineBookingSchema = z.object({
  onlineBookingEnabled: z.boolean(),
  onlineBookingDescription: z.string().max(5000),
  customizePriceDisplay: z.boolean(),
  priceDisplayMode: z.enum(["SHOW_MINIMUM", "HIDE"]),
  showPromptToCall: z.boolean(),
  promptToCallExplanation: z.string().max(2000),
  requireHomeAddress: z.boolean(),
  requireCreditCard: z.boolean(),
  requirePaymentAtBooking: z.boolean(),
});

type OnlineBookingFormValues = z.infer<typeof onlineBookingSchema>;

type Props = {
  settings: ServiceOnlineBookingSettings | null;
  directLink?: string | null;
  hint?: string | null;
  isSaving?: boolean;
  onSave: (body: Record<string, unknown>) => Promise<void> | void;
};

function settingsToForm(
  settings: ServiceOnlineBookingSettings | null,
): OnlineBookingFormValues {
  return {
    onlineBookingEnabled: Boolean(settings?.onlineBookingEnabled ?? true),
    onlineBookingDescription: settings?.onlineBookingDescription ?? "",
    customizePriceDisplay: Boolean(settings?.customizePriceDisplay),
    priceDisplayMode: settings?.priceDisplayMode ?? "SHOW_MINIMUM",
    showPromptToCall: Boolean(settings?.showPromptToCall),
    promptToCallExplanation: settings?.promptToCallExplanation ?? "",
    requireHomeAddress: Boolean(settings?.requireHomeAddress),
    requireCreditCard: Boolean(settings?.requireCreditCard),
    requirePaymentAtBooking: settings?.requirePaymentAtBooking === "REQUIRED",
  };
}

function formToApiBody(values: OnlineBookingFormValues): Record<string, unknown> {
  return {
    onlineBookingEnabled: values.onlineBookingEnabled,
    onlineBookingDescription: values.onlineBookingDescription.trim() || null,
    customizePriceDisplay: values.customizePriceDisplay,
    priceDisplayMode: values.customizePriceDisplay
      ? values.priceDisplayMode
      : null,
    showPromptToCall: values.showPromptToCall,
    promptToCallExplanation: values.showPromptToCall
      ? values.promptToCallExplanation.trim() || null
      : null,
    requireHomeAddress: values.requireHomeAddress,
    requireCreditCard: values.requireCreditCard,
    requirePaymentAtBooking: values.requirePaymentAtBooking
      ? "REQUIRED"
      : "NO",
  };
}

function ToggleField({
  control,
  name,
  label,
  description,
}: {
  control: ReturnType<typeof useForm<OnlineBookingFormValues>>["control"];
  name: keyof OnlineBookingFormValues;
  label: string;
  description?: string;
}) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className="flex items-start justify-between gap-4 space-y-0">
          <div className="min-w-0 space-y-1">
            <FormLabel className="text-sm font-medium">{label}</FormLabel>
            {description ? (
              <FormDescription className={SETTINGS_FORM_DESCRIPTION_CLASS}>
                {description}
              </FormDescription>
            ) : null}
          </div>
          <FormControl>
            <Switch
              checked={Boolean(field.value)}
              onCheckedChange={field.onChange}
              className={DRAWER_SWITCH_CLASS}
            />
          </FormControl>
        </FormItem>
      )}
    />
  );
}

export function ServiceOnlineBookingSection({
  settings,
  directLink,
  hint,
  isSaving = false,
  onSave,
}: Props) {
  const { isEditing, startEdit, stopEdit } =
    useSettingsSectionEdit<"online">();
  const form = useForm<OnlineBookingFormValues>({
    resolver: zodResolver(onlineBookingSchema),
    defaultValues: settingsToForm(settings),
  });

  const customizePriceDisplay = useWatch({
    control: form.control,
    name: "customizePriceDisplay",
  });
  const showPromptToCall = useWatch({
    control: form.control,
    name: "showPromptToCall",
  });
  const priceDisplayMode = useWatch({
    control: form.control,
    name: "priceDisplayMode",
  });

  useEffect(() => {
    form.reset(settingsToForm(settings));
    stopEdit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings]);

  const viewValues = settingsToForm(settings);

  const summaryRows = [
    {
      label: "Available",
      value: viewValues.onlineBookingEnabled ? "Yes" : "No",
    },
    {
      label: "Direct Link",
      value: directLink ? "Available" : hint || "Not available",
    },
    {
      label: "Customize price display",
      value: viewValues.customizePriceDisplay
        ? viewValues.priceDisplayMode === "HIDE"
          ? "Hide"
          : "Show minimum"
        : "No",
    },
    {
      label: "Show prompt to call",
      value: viewValues.showPromptToCall ? "Yes" : "No",
    },
    {
      label: "Require home address",
      value: viewValues.requireHomeAddress ? "Yes" : "No",
    },
    {
      label: "Require credit card",
      value: viewValues.requireCreditCard ? "Yes" : "No",
    },
    {
      label: "Require payment",
      value: viewValues.requirePaymentAtBooking ? "Yes" : "No",
    },
  ];

  return (
    <Form {...form}>
      <FormSchemaProvider schema={onlineBookingSchema}>
        <SettingsInlineEditSection
          title="Online Booking"
          summary={<SettingsViewRows rows={summaryRows} />}
          isEditing={isEditing("online")}
          onEdit={() => startEdit("online")}
          onDiscard={() => {
            form.reset(settingsToForm(settings));
            stopEdit();
          }}
          onSave={() =>
            void form.handleSubmit(async (next) => {
              await onSave(formToApiBody(next));
              stopEdit();
            })()
          }
          isDirty={form.formState.isDirty}
          isSaving={isSaving}
        >
          <div className="space-y-4">
            <ToggleField
              control={form.control}
              name="onlineBookingEnabled"
              label="Available in online booking"
            />

            {directLink ? (
              <div className="space-y-2">
                <FormLabel>Direct Link</FormLabel>
                <div className="flex items-center gap-2 rounded-[var(--radius-control)] border border-border p-2 text-sm">
                  <span className="min-w-0 flex-1 truncate">{directLink}</span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      void navigator.clipboard.writeText(directLink);
                      toast.success("Copied");
                    }}
                  >
                    <Copy className="size-3" aria-hidden />
                  </Button>
                </div>
              </div>
            ) : hint ? (
              <p className="text-sm text-muted-foreground">{hint}</p>
            ) : null}

            <TextField
              control={form.control}
              name="onlineBookingDescription"
              label="Description"
              placeholder="Enter online booking description"
              multiline
              rows={3}
            />

            <ToggleField
              control={form.control}
              name="customizePriceDisplay"
              label="Customize price display"
            />
            {customizePriceDisplay ? (
              <SettingsChoiceRadioGroup
                name="price-display-mode"
                aria-label="Price display mode"
                value={priceDisplayMode}
                onValueChange={(value) =>
                  form.setValue(
                    "priceDisplayMode",
                    value as "SHOW_MINIMUM" | "HIDE",
                    { shouldDirty: true },
                  )
                }
                options={[
                  {
                    value: "SHOW_MINIMUM",
                    label: "Show minimum",
                    description: "Display the lowest available price.",
                  },
                  {
                    value: "HIDE",
                    label: "Hide",
                    description: "Do not show a price on the booking page.",
                  },
                ]}
              />
            ) : null}

            <ToggleField
              control={form.control}
              name="showPromptToCall"
              label="Show prompt to call"
            />
            {showPromptToCall ? (
              <TextField
                control={form.control}
                name="promptToCallExplanation"
                label="Prompt to call explanation"
                placeholder="Explain why customers should call"
                multiline
                rows={3}
              />
            ) : null}

            <ToggleField
              control={form.control}
              name="requireHomeAddress"
              label="Require home address"
            />
            <ToggleField
              control={form.control}
              name="requireCreditCard"
              label="Require credit card"
            />
            <ToggleField
              control={form.control}
              name="requirePaymentAtBooking"
              label="Require payment at booking"
            />
          </div>
        </SettingsInlineEditSection>
      </FormSchemaProvider>
    </Form>
  );
}
