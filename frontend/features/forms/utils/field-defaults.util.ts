import type {
  FieldStyle,
  FieldType,
  FormField,
  FormSettings,
} from "@/features/forms/types";

function generateId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `field_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function slugify(label: string | undefined | null): string {
  const base = (label ?? "").toLowerCase().trim() || "field";
  return base
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 48);
}

export const DEFAULT_FIELD_STYLE: FieldStyle = {
  labelPosition: "top",
  labelSize: "sm",
  labelBold: false,
  inputSize: "md",
  inputBorderRadius: "md",
  width: 100,
  marginBottom: 16,
  textAlign: "left",
};

const FIELD_LABELS: Record<FieldType, string> = {
  text: "Text",
  email: "Email",
  phone: "Phone",
  number: "Number",
  password: "Password",
  textarea: "Long text",
  select: "Dropdown",
  multiselect: "Multi-select",
  radio: "Radio group",
  checkbox: "Checkbox",
  toggle: "Toggle",
  date: "Date",
  time: "Time",
  datetime: "Date & time",
  file: "File upload",
  signature: "Signature",
  rating: "Rating",
  range: "Range slider",
  hidden: "Hidden field",
  captcha: "Captcha",
  heading: "Heading",
  paragraph: "Paragraph",
  divider: "Divider",
  spacer: "Spacer",
  image: "Image",
  columns: "Columns",
  name: "Full name",
  address: "Address",
  website: "Website",
};

export function getFieldTypeLabel(type: FieldType): string {
  return FIELD_LABELS[type] ?? "Field";
}

export function createDefaultOptions(count = 3): FormField["options"] {
  return Array.from({ length: count }, (_, i) => ({
    id: generateId(),
    label: `Option ${i + 1}`,
    value: `option_${i + 1}`,
  }));
}

export function createDefaultField(type: FieldType, index?: number): FormField {
  const label = FIELD_LABELS[type] ?? "Field";
  const suffix = index != null ? `_${index + 1}` : "";
  const base: FormField = {
    id: generateId(),
    type,
    label,
    name: `${slugify(label)}${suffix}`,
    validation: {},
    style: { ...DEFAULT_FIELD_STYLE },
  };

  switch (type) {
    case "heading":
      return {
        ...base,
        label: "Section heading",
        name: `heading${suffix}`,
        content: "Section heading",
        level: 2,
      };
    case "paragraph":
      return {
        ...base,
        label: "Paragraph",
        name: `paragraph${suffix}`,
        content: "Add descriptive text for your form visitors.",
      };
    case "divider":
    case "spacer":
      return {
        ...base,
        label,
        name: `${type}${suffix}`,
        spacerHeight: type === "spacer" ? 24 : undefined,
      };
    case "image":
      return {
        ...base,
        label: "Image",
        name: `image${suffix}`,
        src: "",
      };
    case "hidden":
      return {
        ...base,
        label: "Hidden value",
        name: `hidden${suffix}`,
        hiddenValue: "",
      };
    case "checkbox":
      return {
        ...base,
        label: "I agree to the terms",
        options: [{ id: generateId(), label: "I agree", value: "yes" }],
      };
    case "toggle":
      return {
        ...base,
        label: "Enable notifications",
        defaultValue: "false",
      };
    case "select":
    case "multiselect":
    case "radio":
      return { ...base, options: createDefaultOptions() };
    case "columns":
      return {
        ...base,
        columnCount: 2,
        columns: [
          [createDefaultField("text", 0)],
          [createDefaultField("text", 1)],
        ],
      };
    case "captcha":
      return {
        ...base,
        label: "Security check",
        name: `captcha${suffix}`,
      };
    case "signature":
      return {
        ...base,
        label: "Signature",
        name: `signature${suffix}`,
        helpText: "Visual placeholder — drawing not persisted in this phase.",
      };
    case "rating":
      return {
        ...base,
        label: "Rate your experience",
        maxStars: 5,
        ratingStyle: "stars",
        minRating: 1,
        maxRating: 5,
      };
    case "range":
      return {
        ...base,
        label: "Select a value",
        validation: { min: 0, max: 100 },
        step: 1,
        defaultValue: "50",
      };
    case "name":
      return {
        ...base,
        label: "Full name",
        showFirstName: true,
        showMiddleName: false,
        showLastName: true,
        placeholder: "First and last name",
      };
    case "address":
      return {
        ...base,
        label: "Address",
        placeholder: "Street, city, state, zip",
      };
    case "website":
      return {
        ...base,
        label: "Website",
        placeholder: "https://example.com",
      };
    case "file":
      return {
        ...base,
        label: "Upload file",
        accept: "*/*",
        maxFiles: 1,
        helpText: "File upload visual only — no persistence in this phase.",
      };
    case "textarea":
      return {
        ...base,
        placeholder: "Enter your message",
        rows: 4,
      };
    case "password":
      return {
        ...base,
        placeholder: "Enter password",
      };
    case "datetime":
      return {
        ...base,
        placeholder: "Select date and time",
      };
    default:
      return {
        ...base,
        placeholder: `Enter ${(label ?? "value").toLowerCase()}`,
      };
  }
}

export function createDefaultFormSettings(): FormSettings {
  return {
    title: "Untitled form",
    description: "",
    submitButtonLabel: "Submit",
    successMessage: "Thank you! Your submission has been received.",
    showRequiredIndicator: true,
    submitButtonRadius: "md",
    submitButtonFullWidth: false,
    submitButtonAlign: "left",
    submitButtonBgColor: "",
    submitButtonTextColor: "",
    maxWidth: 640,
    padding: 24,
    borderRadius: "lg",
    backgroundColor: "",
    textColor: "",
    accentColor: "#6366f1",
    labelFont: "system",
    inputFont: "system",
    multiStep: false,
    showProgressBar: true,
    steps: [],
  };
}

export const INPUT_FIELD_TYPES: FieldType[] = [
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
  "name",
  "address",
  "website",
  "captcha",
];

export const LAYOUT_FIELD_TYPES: FieldType[] = [
  "heading",
  "paragraph",
  "divider",
  "spacer",
  "image",
  "columns",
];

export const CHOICE_FIELD_TYPES: FieldType[] = [
  "select",
  "multiselect",
  "radio",
  "checkbox",
];

export const PALETTE_CATEGORIES: {
  id: string;
  label: string;
  types: FieldType[];
}[] = [
  {
    id: "basic",
    label: "Basic",
    types: ["text", "email", "phone", "number", "password", "textarea", "website"],
  },
  {
    id: "choice",
    label: "Choice",
    types: ["select", "multiselect", "radio", "checkbox", "toggle"],
  },
  {
    id: "datetime",
    label: "Date & Time",
    types: ["date", "time", "datetime"],
  },
  {
    id: "advanced",
    label: "Advanced",
    types: ["file", "signature", "rating", "range", "hidden", "captcha"],
  },
  {
    id: "personal",
    label: "Personal",
    types: ["name", "address"],
  },
  {
    id: "layout",
    label: "Layout",
    types: ["heading", "paragraph", "divider", "spacer", "image", "columns"],
  },
];
