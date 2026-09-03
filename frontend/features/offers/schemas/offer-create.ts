import { z } from "zod";

export const offerCreateSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  description: z.string().trim().max(2000).optional(),
});

export type OfferCreateFormValues = z.infer<typeof offerCreateSchema>;

export const offerCreateDefaults: OfferCreateFormValues = {
  name: "",
  description: "",
};
