"use client";

import { useEffect, useMemo, type ReactNode } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckboxField } from "@/components/forms/checkbox-field";
import { SelectField } from "@/components/forms/select-field";
import { TextField } from "@/components/forms/text-field";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Form, FormSchemaProvider } from "@/components/ui/form";
import type {
  PlanEmbedSettings,
  PlanGroupDetail,
  PlanTier,
} from "@/features/platform/types/plan-group";
import {
  planGroupStyleSchema,
  type PlanGroupStyleValues,
} from "@/features/platform/schemas/plan-group-form";
import {
  getDefaultStyleFormValues,
  resolvePlanGroupDesignSettings,
  stripEmptyDesignSettings,
} from "@/features/platform/utils/plan-design-settings.util";
import { FeatureListGapField } from "./feature-list-gap-field";
import { PlanDesignColorField } from "./plan-design-color-field";
import { StyleTabTierPreview } from "./style-tab-tier-preview";

export const PLAN_GROUP_STYLE_FORM_ID = "plan-group-style-form";

const ALIGNMENT_ITEMS = [
  { value: "left", label: "Left" },
  { value: "center", label: "Center" },
  { value: "right", label: "Right" },
] as const;

type PlanGroupStyleTabProps = {
  planGroup: PlanGroupDetail;
  tiers: PlanTier[];
  embed: PlanEmbedSettings;
  canManage: boolean;
  onSave: (values: PlanGroupStyleValues) => void;
};

function StyleModuleSection({
  value,
  title,
  description,
  children,
}: {
  value: string;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <AccordionItem value={value} className="rounded-lg border px-4">
      <AccordionTrigger className="items-center py-4 hover:no-underline">
        <div className="min-w-0 text-left">
          <h3 className="text-sm font-medium">{title}</h3>
          {description ? (
            <p className="text-xs font-normal text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
      </AccordionTrigger>
      <AccordionContent className="pb-4">
        <div className="grid gap-4 sm:grid-cols-2">{children}</div>
      </AccordionContent>
    </AccordionItem>
  );
}

export function PlanGroupStyleTab({
  planGroup,
  tiers,
  embed,
  canManage,
  onSave,
}: PlanGroupStyleTabProps) {
  const defaults = useMemo(
    () => getDefaultStyleFormValues(planGroup.designSettings, embed),
    [planGroup.designSettings, embed],
  );

  const form = useForm<PlanGroupStyleValues>({
    resolver: zodResolver(planGroupStyleSchema),
    defaultValues: defaults,
  });

  const watchedValues = useWatch({
    control: form.control,
    defaultValue: defaults,
  });

  const previewDesignSettings = useMemo(
    () =>
      resolvePlanGroupDesignSettings(
        stripEmptyDesignSettings(watchedValues ?? defaults),
        embed,
      ),
    [watchedValues, defaults, embed],
  );

  useEffect(() => {
    form.reset(getDefaultStyleFormValues(planGroup.designSettings, embed));
  }, [planGroup.designSettings, embed, form]);

  const handleSave = (values: PlanGroupStyleValues) => {
    onSave(values);
  };

  return (
    <Form {...form}>
      <FormSchemaProvider schema={planGroupStyleSchema}>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]">
          <form
            id={PLAN_GROUP_STYLE_FORM_ID}
            className="space-y-3"
            onSubmit={form.handleSubmit(handleSave)}
          >
            <Accordion
              multiple
              defaultValue={["global"]}
              className="flex flex-col gap-3"
            >
              <StyleModuleSection
                value="global"
                title="Global / Layout"
                description="Theme, layout, typography base, colors, and display toggles."
              >
                <SelectField
                  control={form.control}
                  name="theme"
                  label="Theme"
                  searchable={false}
                  disabled={!canManage}
                  items={[
                    { value: "light", label: "Light" },
                    { value: "dark", label: "Dark" },
                    { value: "custom", label: "Custom" },
                  ]}
                />
                <SelectField
                  control={form.control}
                  name="layout"
                  label="Layout"
                  searchable={false}
                  disabled={!canManage}
                  items={[
                    { value: "cards", label: "Cards" },
                    { value: "compact", label: "Compact" },
                    { value: "comparison", label: "Comparison" },
                  ]}
                />
                <SelectField
                  control={form.control}
                  name="columns"
                  label="Columns"
                  searchable={false}
                  disabled={!canManage}
                  items={[
                    { value: "auto", label: "Auto" },
                    { value: "2", label: "2" },
                    { value: "3", label: "3" },
                    { value: "4", label: "4" },
                  ]}
                />
                <SelectField
                  control={form.control}
                  name="cardWidth"
                  label="Card width"
                  searchable={false}
                  disabled={!canManage}
                  items={[
                    { value: "auto", label: "Auto (fill column)" },
                    { value: "narrow", label: "Narrow (280px)" },
                    { value: "medium", label: "Medium (360px)" },
                    { value: "wide", label: "Wide (480px)" },
                    { value: "full", label: "Full width" },
                  ]}
                />
                <TextField
                  control={form.control}
                  name="fontFamily"
                  label="Font family"
                  disabled={!canManage}
                />
                <PlanDesignColorField
                  control={form.control}
                  name="sectionTextColor"
                  label="Section text"
                  disabled={!canManage}
                />
                <PlanDesignColorField
                  control={form.control}
                  name="sectionMutedTextColor"
                  label="Muted text"
                  disabled={!canManage}
                />
                <PlanDesignColorField
                  control={form.control}
                  name="accentColor"
                  label="Accent"
                  disabled={!canManage}
                />
                <CheckboxField
                  control={form.control}
                  name="showMonthlyYearlyToggle"
                  label="Monthly / yearly toggle"
                  disabled={!canManage}
                />
                <CheckboxField
                  control={form.control}
                  name="showPlanGroupTitle"
                  label="Show plan group title"
                  disabled={!canManage}
                />
                <CheckboxField
                  control={form.control}
                  name="showPlanGroupDescription"
                  label="Show plan group description"
                  disabled={!canManage}
                />
                <CheckboxField
                  control={form.control}
                  name="showSetupFee"
                  label="Show setup fee"
                  disabled={!canManage}
                />
                <CheckboxField
                  control={form.control}
                  name="showTrialDays"
                  label="Show trial days"
                  disabled={!canManage}
                />
                <CheckboxField
                  control={form.control}
                  name="showFeatureComparison"
                  label="Show comparison table"
                  disabled={!canManage}
                />
              </StyleModuleSection>

              <StyleModuleSection
                value="tier-title"
                title="Tier title"
                description="Alignment, weight, and size for tier names."
              >
                <SelectField
                  control={form.control}
                  name="tierNameAlignment"
                  label="Alignment"
                  searchable={false}
                  disabled={!canManage}
                  items={[...ALIGNMENT_ITEMS]}
                />
                <TextField
                  control={form.control}
                  name="headingFontSize"
                  label="Font size"
                  disabled={!canManage}
                />
                <CheckboxField
                  control={form.control}
                  name="tierNameBold"
                  label="Bold"
                  disabled={!canManage}
                />
                <CheckboxField
                  control={form.control}
                  name="tierNameItalic"
                  label="Italic"
                  disabled={!canManage}
                />
              </StyleModuleSection>

              <StyleModuleSection
                value="tier-description"
                title="Tier description"
                description="Visibility, alignment, weight, and size for tier descriptions."
              >
                <CheckboxField
                  control={form.control}
                  name="showDescriptions"
                  label="Show descriptions"
                  disabled={!canManage}
                />
                <SelectField
                  control={form.control}
                  name="descriptionAlignment"
                  label="Alignment"
                  searchable={false}
                  disabled={!canManage}
                  items={[...ALIGNMENT_ITEMS]}
                />
                <TextField
                  control={form.control}
                  name="bodyFontSize"
                  label="Font size"
                  disabled={!canManage}
                />
                <CheckboxField
                  control={form.control}
                  name="descriptionBold"
                  label="Bold"
                  disabled={!canManage}
                />
                <CheckboxField
                  control={form.control}
                  name="descriptionItalic"
                  label="Italic"
                  disabled={!canManage}
                />
              </StyleModuleSection>

              <StyleModuleSection
                value="price"
                title="Price"
                description="Alignment and weight for price display."
              >
                <SelectField
                  control={form.control}
                  name="priceAlignment"
                  label="Alignment"
                  searchable={false}
                  disabled={!canManage}
                  items={[...ALIGNMENT_ITEMS]}
                />
                <CheckboxField
                  control={form.control}
                  name="priceBold"
                  label="Bold"
                  disabled={!canManage}
                />
                <CheckboxField
                  control={form.control}
                  name="priceItalic"
                  label="Italic"
                  disabled={!canManage}
                />
              </StyleModuleSection>

              <StyleModuleSection
                value="badge"
                title="Badge"
                description="Badge visibility. Colors can be overridden per tier in the Tiers tab."
              >
                <CheckboxField
                  control={form.control}
                  name="showBadges"
                  label="Show badges"
                  disabled={!canManage}
                />
              </StyleModuleSection>

              <StyleModuleSection
                value="features"
                title="Features list"
                description="Icon style, colors, and text weight for feature bullets."
              >
                <SelectField
                  control={form.control}
                  name="featureIconStyle"
                  label="Icon style"
                  searchable={false}
                  disabled={!canManage}
                  items={[
                    { value: "check", label: "Check" },
                    { value: "dot", label: "Dot" },
                    { value: "plus", label: "Plus" },
                    { value: "none", label: "None" },
                  ]}
                />
                <PlanDesignColorField
                  control={form.control}
                  name="featureIconColor"
                  label="Icon color"
                  disabled={!canManage}
                />
                <PlanDesignColorField
                  control={form.control}
                  name="featureIconBackgroundColor"
                  label="Icon background"
                  disabled={!canManage}
                />
                <SelectField
                  control={form.control}
                  name="featureIconSize"
                  label="Icon size"
                  searchable={false}
                  disabled={!canManage}
                  items={[
                    { value: "sm", label: "Small" },
                    { value: "md", label: "Medium" },
                    { value: "lg", label: "Large" },
                  ]}
                />
                <FeatureListGapField
                  control={form.control}
                  name="featureListGap"
                  label="Item spacing"
                  disabled={!canManage}
                />
                <CheckboxField
                  control={form.control}
                  name="featureListBold"
                  label="Bold"
                  disabled={!canManage}
                />
                <CheckboxField
                  control={form.control}
                  name="showTierFeatures"
                  label="Show tier feature bullets"
                  disabled={!canManage}
                />
                <CheckboxField
                  control={form.control}
                  name="showCapabilities"
                  label="Show capability chips"
                  disabled={!canManage}
                />
              </StyleModuleSection>

              <StyleModuleSection
                value="cta"
                title="CTA button"
                description="Button style, colors, radius, and alignment."
              >
                <SelectField
                  control={form.control}
                  name="buttonStyle"
                  label="Button style"
                  searchable={false}
                  disabled={!canManage}
                  items={[
                    { value: "solid", label: "Solid" },
                    { value: "outline", label: "Outline" },
                    { value: "soft", label: "Soft" },
                  ]}
                />
                <SelectField
                  control={form.control}
                  name="ctaAlignment"
                  label="Alignment"
                  searchable={false}
                  disabled={!canManage}
                  items={[...ALIGNMENT_ITEMS]}
                />
                <PlanDesignColorField
                  control={form.control}
                  name="buttonBackgroundColor"
                  label="Background"
                  disabled={!canManage}
                />
                <PlanDesignColorField
                  control={form.control}
                  name="buttonTextColor"
                  label="Text color"
                  disabled={!canManage}
                />
                <TextField
                  control={form.control}
                  name="buttonBorderRadius"
                  label="Border radius"
                  disabled={!canManage}
                />
                <CheckboxField
                  control={form.control}
                  name="ctaBold"
                  label="Bold"
                  disabled={!canManage}
                />
              </StyleModuleSection>

              <StyleModuleSection
                value="card"
                title="Card"
                description="Container background, border, radius, shadow, and text color."
              >
                <PlanDesignColorField
                  control={form.control}
                  name="cardBackgroundColor"
                  label="Background"
                  disabled={!canManage}
                />
                <PlanDesignColorField
                  control={form.control}
                  name="cardTextColor"
                  label="Text color"
                  disabled={!canManage}
                />
                <PlanDesignColorField
                  control={form.control}
                  name="cardBorderColor"
                  label="Border color"
                  disabled={!canManage}
                />
                <TextField
                  control={form.control}
                  name="cardBorderRadius"
                  label="Border radius"
                  disabled={!canManage}
                />
                <SelectField
                  control={form.control}
                  name="cardShadow"
                  label="Shadow"
                  searchable={false}
                  disabled={!canManage}
                  items={[
                    { value: "none", label: "None" },
                    { value: "sm", label: "Small" },
                    { value: "md", label: "Medium" },
                    { value: "lg", label: "Large" },
                  ]}
                />
              </StyleModuleSection>
            </Accordion>
          </form>

          <aside className="lg:sticky lg:top-6 lg:self-start">
            <StyleTabTierPreview
              designSettings={previewDesignSettings}
              tiers={tiers}
              currency={planGroup.currency}
              billingCycles={planGroup.billingCycles}
              defaultCtaLabel={planGroup.defaultCtaLabel}
              defaultCtaUrl={planGroup.defaultCtaUrl}
            />
          </aside>
        </div>
      </FormSchemaProvider>
    </Form>
  );
}

export function styleValuesToDesignSettings(
  values: PlanGroupStyleValues,
): Record<string, unknown> {
  return stripEmptyDesignSettings(values);
}
