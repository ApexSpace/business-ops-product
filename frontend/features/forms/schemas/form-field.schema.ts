import { z } from "zod";

export const fieldOptionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1, "Option label is required"),
  value: z.string().min(1, "Option value is required"),
});

export const fieldValidationSchema = z.object({
  required: z.boolean().optional(),
  minLength: z.number().int().min(0).optional(),
  maxLength: z.number().int().min(0).optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  pattern: z.string().optional(),
  patternMessage: z.string().optional(),
  customMessage: z.string().optional(),
});

export const fieldStyleSchema = z.object({
  labelPosition: z.enum(["top", "left", "hidden"]).optional(),
  labelSize: z.enum(["xs", "sm", "base", "lg"]).optional(),
  labelBold: z.boolean().optional(),
  labelColor: z.string().optional(),
  inputSize: z.enum(["sm", "md", "lg"]).optional(),
  inputBorderRadius: z.enum(["none", "sm", "md", "lg", "full"]).optional(),
  inputBgColor: z.string().optional(),
  inputTextColor: z.string().optional(),
  inputBorderColor: z.string().optional(),
  width: z
    .union([
      z.enum(["full", "half"]),
      z.literal(25),
      z.literal(33),
      z.literal(50),
      z.literal(67),
      z.literal(75),
      z.literal(100),
    ])
    .optional(),
  marginBottom: z.number().optional(),
  textAlign: z.enum(["left", "center", "right"]).optional(),
  className: z.string().optional(),
});

export const ratingStyleSchema = z.enum(["stars", "hearts", "thumbs", "numbers"]);

export const fieldTypeSchema = z.enum([
  "text",
  "email",
  "phone",
  "number",
  "password",
  "textarea",
  "select",
  "multiselect",
  "radio",
  "checkbox",
  "toggle",
  "date",
  "time",
  "datetime",
  "file",
  "signature",
  "rating",
  "range",
  "hidden",
  "captcha",
  "heading",
  "paragraph",
  "divider",
  "spacer",
  "image",
  "columns",
  "name",
  "address",
  "website",
]);

export const formFieldSchema: z.ZodType<{
  id: string;
  type: z.infer<typeof fieldTypeSchema>;
  label: string;
  name: string;
  placeholder?: string;
  helpText?: string;
  defaultValue?: string;
  options?: z.infer<typeof fieldOptionSchema>[];
  validation?: z.infer<typeof fieldValidationSchema>;
  style?: z.infer<typeof fieldStyleSchema>;
  content?: string;
  columns?: unknown[][];
  hiddenValue?: string;
  rows?: number;
  accept?: string;
  maxFiles?: number;
  maxStars?: number;
  ratingStyle?: z.infer<typeof ratingStyleSchema>;
  step?: number;
  minRating?: number;
  maxRating?: number;
  level?: 1 | 2 | 3 | 4;
  spacerHeight?: number;
  src?: string;
  columnCount?: 2 | 3;
  showFirstName?: boolean;
  showMiddleName?: boolean;
  showLastName?: boolean;
}> = z.lazy(() =>
  z.object({
    id: z.string().min(1),
    type: fieldTypeSchema,
    label: z.string().min(1, "Label is required"),
    name: z
      .string()
      .min(1, "Field name is required")
      .regex(/^[a-z][a-z0-9_]*$/i, "Use letters, numbers, and underscores"),
    placeholder: z.string().optional(),
    helpText: z.string().optional(),
    defaultValue: z.string().optional(),
    options: z.array(fieldOptionSchema).optional(),
    validation: fieldValidationSchema.optional(),
    style: fieldStyleSchema.optional(),
    content: z.string().optional(),
    columns: z.array(z.array(formFieldSchema)).optional(),
    hiddenValue: z.string().optional(),
    rows: z.number().int().min(1).optional(),
    accept: z.string().optional(),
    maxFiles: z.number().int().min(1).optional(),
    maxStars: z.number().int().min(1).max(10).optional(),
    ratingStyle: ratingStyleSchema.optional(),
    step: z.number().optional(),
    minRating: z.number().optional(),
    maxRating: z.number().optional(),
    level: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]).optional(),
    spacerHeight: z.number().optional(),
    src: z.string().optional(),
    columnCount: z.union([z.literal(2), z.literal(3)]).optional(),
    showFirstName: z.boolean().optional(),
    showMiddleName: z.boolean().optional(),
    showLastName: z.boolean().optional(),
  }),
);
