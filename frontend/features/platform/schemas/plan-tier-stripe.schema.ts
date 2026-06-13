import { z } from "zod";

export const planTierStripeSchema = z.object({
  productId: z.string().optional().or(z.literal("")),
  monthlyPriceId: z.string().optional().or(z.literal("")),
  yearlyPriceId: z.string().optional().or(z.literal("")),
});

export type PlanTierStripeValues = z.infer<typeof planTierStripeSchema>;

export const emptyPlanTierStripeValues: PlanTierStripeValues = {
  productId: "",
  monthlyPriceId: "",
  yearlyPriceId: "",
};
