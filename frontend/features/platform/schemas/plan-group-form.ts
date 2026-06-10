import { z } from "zod";
import { currencySelectOptions } from "@/features/payments/utils/currencies";

const planGroupCurrencySchema = z
  .string()
  .min(1, "Select a currency")
  .refine(
    (code) => currencySelectOptions.some((option) => option.value === code),
    "Select a supported currency",
  );

export const createPlanGroupSchema = z.object({
  name: z.string().min(2, "Name is required"),
  description: z.string().optional(),
  currency: planGroupCurrencySchema,
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
});

export type CreatePlanGroupValues = z.infer<typeof createPlanGroupSchema>;

export const planGroupOverviewSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  currency: planGroupCurrencySchema,
  billingCycles: z.array(z.string()).min(1),
  snapshotId: z.string().uuid().optional().or(z.literal("")),
});

export type PlanGroupOverviewValues = z.infer<typeof planGroupOverviewSchema>;

const optionalHexColor = z
  .string()
  .optional()
  .refine(
    (value) => !value?.trim() || /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(value.trim()),
    "Enter a valid hex color",
  );

export const planGroupStyleSchema = z.object({
  theme: z.enum(["light", "dark", "custom"]),
  layout: z.enum(["cards", "compact", "comparison"]),
  columns: z.enum(["auto", "2", "3", "4"]),
  cardWidth: z.enum(["auto", "narrow", "medium", "wide", "full"]),
  sectionTextColor: optionalHexColor,
  sectionMutedTextColor: optionalHexColor,
  accentColor: optionalHexColor,
  fontFamily: z.string().optional(),
  headingFontSize: z.string().optional(),
  bodyFontSize: z.string().optional(),
  cardBackgroundColor: optionalHexColor,
  cardTextColor: optionalHexColor,
  cardBorderColor: optionalHexColor,
  cardBorderRadius: z.string().optional(),
  cardShadow: z.enum(["none", "sm", "md", "lg"]),
  buttonStyle: z.enum(["solid", "outline", "soft"]),
  buttonBackgroundColor: optionalHexColor,
  buttonTextColor: optionalHexColor,
  buttonBorderRadius: z.string().optional(),
  featureIconStyle: z.enum(["check", "dot", "plus", "none"]),
  featureIconColor: optionalHexColor,
  featureIconBackgroundColor: optionalHexColor,
  featureIconSize: z.enum(["sm", "md", "lg"]),
  showMonthlyYearlyToggle: z.boolean(),
  showPlanGroupTitle: z.boolean(),
  showPlanGroupDescription: z.boolean(),
  showSetupFee: z.boolean(),
  showTrialDays: z.boolean(),
  showCapabilities: z.boolean(),
  showTierFeatures: z.boolean(),
  showBadges: z.boolean(),
  showDescriptions: z.boolean(),
  showFeatureComparison: z.boolean(),
  tierNameAlignment: z.enum(["left", "center", "right"]),
  priceAlignment: z.enum(["left", "center", "right"]),
  descriptionAlignment: z.enum(["left", "center", "right"]),
  ctaAlignment: z.enum(["left", "center", "right"]),
  tierNameBold: z.boolean(),
  tierNameItalic: z.boolean(),
  descriptionBold: z.boolean(),
  descriptionItalic: z.boolean(),
  priceBold: z.boolean(),
  priceItalic: z.boolean(),
  featureListBold: z.boolean(),
  featureListGap: z.number().min(0.1).max(1.5),
  ctaBold: z.boolean(),
});

export type PlanGroupStyleValues = z.infer<typeof planGroupStyleSchema>;

export const createPlanTierSchema = z.object({
  name: z.string().min(1, "Name is required"),
  slug: z.string().optional().or(z.literal("")),
  description: z.string().optional(),
  priceMonthly: z.string().optional(),
  priceYearly: z.string().optional(),
  setupFee: z.string().optional(),
  trialDays: z.string().optional(),
  badge: z.string().optional(),
  highlighted: z.boolean().optional(),
  ctaLabel: z.string().optional(),
  ctaUrl: z.string().optional(),
});

export type CreatePlanTierValues = z.infer<typeof createPlanTierSchema>;

export const planEmbedSchema = z.object({
  theme: z.enum(["LIGHT", "DARK", "AUTO"]),
  layout: z.enum(["CARDS", "COMPARISON"]),
  showMonthlyYearlyToggle: z.boolean(),
  showFeatureComparison: z.boolean(),
  showSetupFee: z.boolean(),
  showTrialDays: z.boolean(),
  showCapabilities: z.boolean(),
  showTierFeatures: z.boolean(),
  customCss: z.string().optional(),
});

export type PlanEmbedValues = z.infer<typeof planEmbedSchema>;

export function parseOptionalDecimal(value?: string): number | undefined {
  if (!value?.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function parseOptionalInt(value?: string): number | undefined {
  if (!value?.trim()) return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}
