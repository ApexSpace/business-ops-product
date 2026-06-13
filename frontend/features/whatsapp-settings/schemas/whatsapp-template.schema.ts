import { z } from "zod";

export const whatsappTemplateButtonSchema = z.object({
  type: z.enum(["QUICK_REPLY", "URL", "PHONE_NUMBER", "COPY_CODE"]),
  text: z.string().trim().min(1, "Button label is required").max(25),
  url: z.string().optional(),
  phone_number: z.string().optional(),
});

export const whatsappTemplateFormSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Template name is required")
      .max(512)
      .regex(
        /^[a-z][a-z0-9_]*$/,
        "Use lowercase letters, numbers, and underscores. Must start with a letter.",
      ),
    language: z.string().trim().min(2, "Language is required"),
    category: z.enum(["MARKETING", "UTILITY", "AUTHENTICATION"]),
    headerType: z.enum(["none", "text", "image", "video", "document"]),
    headerText: z.string().max(60).optional(),
    bodyText: z
      .string()
      .trim()
      .min(1, "Body text is required")
      .max(1024),
    footerText: z.string().max(60).optional(),
    buttons: z.array(whatsappTemplateButtonSchema).max(3),
  })
  .superRefine((values, ctx) => {
    if (values.headerType === "text" && !values.headerText?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Header text is required for text headers",
        path: ["headerText"],
      });
    }

    values.buttons.forEach((button, index) => {
      if (button.type === "URL" && !button.url?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "URL is required",
          path: ["buttons", index, "url"],
        });
      }
      if (button.type === "PHONE_NUMBER" && !button.phone_number?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Phone number is required",
          path: ["buttons", index, "phone_number"],
        });
      }
    });
  });

export type WhatsAppTemplateFormValues = z.infer<
  typeof whatsappTemplateFormSchema
>;

export const whatsappTemplateFormDefaults: WhatsAppTemplateFormValues = {
  name: "",
  language: "en_US",
  category: "UTILITY",
  headerType: "none",
  headerText: "",
  bodyText: "",
  footerText: "",
  buttons: [],
};
