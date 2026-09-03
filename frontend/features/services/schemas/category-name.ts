import { z } from "zod";

export const categoryNameSchema = z.object({
  name: z.string().trim().min(1, "Category name is required").max(200),
});

export type CategoryNameFormValues = z.infer<typeof categoryNameSchema>;

export const categoryNameDefaults: CategoryNameFormValues = {
  name: "",
};
