import { z } from "zod";
import { formFieldSchema } from "@/features/forms/schemas/form-field.schema";

export const formStepSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1, "Step title is required"),
  fieldIds: z.array(z.string()),
});

export const formSettingsSchema = z.object({
  title: z.string().min(1, "Form title is required"),
  description: z.string().optional(),
  submitButtonLabel: z.string().min(1, "Submit button label is required"),
  successMessage: z.string().min(1, "Success message is required"),
  notifyEmail: z.string().email("Enter a valid email").optional().or(z.literal("")),
  redirectUrl: z.string().url("Enter a valid URL").optional().or(z.literal("")),
  showRequiredIndicator: z.boolean(),
  submitButtonRadius: z.enum(["none", "sm", "md", "lg", "full"]).optional(),
  submitButtonFullWidth: z.boolean().optional(),
  submitButtonAlign: z.enum(["left", "center", "right"]).optional(),
  submitButtonBgColor: z.string().optional(),
  submitButtonTextColor: z.string().optional(),
  maxWidth: z.number().optional(),
  padding: z.number().optional(),
  borderRadius: z.enum(["none", "sm", "md", "lg", "full"]).optional(),
  backgroundColor: z.string().optional(),
  textColor: z.string().optional(),
  accentColor: z.string().optional(),
  labelFont: z.enum(["system", "serif", "sans", "mono"]).optional(),
  inputFont: z.enum(["system", "serif", "sans", "mono"]).optional(),
  multiStep: z.boolean().optional(),
  showProgressBar: z.boolean().optional(),
  steps: z.array(formStepSchema).optional(),
});

export const formDefinitionSchema = z.object({
  fields: z.array(formFieldSchema).min(1, "Add at least one field"),
  settings: formSettingsSchema,
});

export const formCreateSchema = z.object({
  name: z.string().min(1, "Form name is required").max(120, "Name is too long"),
});

export type FormCreateFormValues = z.infer<typeof formCreateSchema>;

export const formCreateDefaults: FormCreateFormValues = {
  name: "",
};
