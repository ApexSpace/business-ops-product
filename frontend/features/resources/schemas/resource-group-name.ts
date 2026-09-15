import { z } from "zod";

export const resourceGroupNameSchema = z.object({
  name: z.string().trim().min(1, "Group name is required").max(200),
});

export type ResourceGroupNameFormValues = z.infer<
  typeof resourceGroupNameSchema
>;

export const resourceGroupNameDefaults: ResourceGroupNameFormValues = {
  name: "",
};
