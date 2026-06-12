export type FieldType =
  | "text"
  | "email"
  | "phone"
  | "number"
  | "password"
  | "textarea"
  | "select"
  | "multiselect"
  | "radio"
  | "checkbox"
  | "toggle"
  | "date"
  | "time"
  | "datetime"
  | "file"
  | "signature"
  | "rating"
  | "range"
  | "hidden"
  | "captcha"
  | "heading"
  | "paragraph"
  | "divider"
  | "spacer"
  | "image"
  | "columns"
  | "name"
  | "address"
  | "website";

export type FormStatus = "draft" | "published" | "archived";

export type LabelPosition = "top" | "left" | "hidden";
export type LabelSize = "xs" | "sm" | "base" | "lg";
export type InputSize = "sm" | "md" | "lg";
export type BorderRadius = "none" | "sm" | "md" | "lg" | "full";
export type FieldWidth = 25 | 33 | 50 | 67 | 75 | 100;
export type TextAlign = "left" | "center" | "right";
export type RatingStyle = "stars" | "hearts" | "thumbs" | "numbers";
export type FontPreset = "system" | "serif" | "sans" | "mono";
export type SubmitButtonAlign = "left" | "center" | "right";
export type PreviewDevice = "desktop" | "tablet" | "mobile";

export interface FieldOption {
  id: string;
  label: string;
  value: string;
}

export interface FieldValidation {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;
  patternMessage?: string;
  customMessage?: string;
}

export interface FieldStyle {
  labelPosition?: LabelPosition;
  labelSize?: LabelSize;
  labelBold?: boolean;
  labelColor?: string;
  inputSize?: InputSize;
  inputBorderRadius?: BorderRadius;
  inputBgColor?: string;
  inputTextColor?: string;
  inputBorderColor?: string;
  width?: FieldWidth | "full" | "half";
  marginBottom?: number;
  textAlign?: TextAlign;
  className?: string;
}

export interface FormField {
  id: string;
  type: FieldType;
  label: string;
  name: string;
  placeholder?: string;
  helpText?: string;
  defaultValue?: string;
  options?: FieldOption[];
  validation?: FieldValidation;
  style?: FieldStyle;
  content?: string;
  columns?: FormField[][];
  hiddenValue?: string;
  rows?: number;
  accept?: string;
  maxFiles?: number;
  maxStars?: number;
  ratingStyle?: RatingStyle;
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
}

export interface FormStep {
  id: string;
  title: string;
  fieldIds: string[];
}

export interface FormSettings {
  title: string;
  description?: string;
  submitButtonLabel: string;
  successMessage: string;
  notifyEmail?: string;
  redirectUrl?: string;
  showRequiredIndicator: boolean;
  submitButtonRadius?: BorderRadius;
  submitButtonFullWidth?: boolean;
  submitButtonAlign?: SubmitButtonAlign;
  submitButtonBgColor?: string;
  submitButtonTextColor?: string;
  maxWidth?: number;
  padding?: number;
  borderRadius?: BorderRadius;
  backgroundColor?: string;
  textColor?: string;
  accentColor?: string;
  labelFont?: FontPreset;
  inputFont?: FontPreset;
  multiStep?: boolean;
  showProgressBar?: boolean;
  steps?: FormStep[];
}

export interface FormDefinition {
  fields: FormField[];
  settings: FormSettings;
}

export interface FormRecord {
  id: string;
  name: string;
  slug?: string | null;
  publicKey?: string;
  status: FormStatus;
  definition: FormDefinition;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string | null;
  archivedAt?: string | null;
}

export interface FormBuilderState {
  formId: string | null;
  name: string;
  status: FormStatus;
  definition: FormDefinition;
  selectedFieldId: string | null;
  isDirty: boolean;
  isSaving: boolean;
  activeStepIndex?: number;
  isPreviewOpen?: boolean;
  previewDevice?: PreviewDevice;
}

export interface FormListItem {
  id: string;
  name: string;
  slug?: string | null;
  publicKey?: string;
  status: FormStatus;
  fieldCount: number;
  submissionCount: number;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string | null;
  archivedAt?: string | null;
}

export interface FormSubmissionListItem {
  id: string;
  formId: string;
  data: Record<string, unknown>;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}

export interface FormSubmissionsListFilters {
  page?: number;
  limit?: number;
  sortDir?: "asc" | "desc";
}

export interface FormSubmissionsListResult {
  items: FormSubmissionListItem[];
  meta: {
    total: number;
    page: number;
    limit: number;
  };
}

export interface FormsListFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: FormStatus | "all";
  sort?: "name" | "updatedAt" | "createdAt" | "status";
  sortDir?: "asc" | "desc";
}

export interface FormsListResult {
  items: FormListItem[];
  meta: {
    total: number;
    page: number;
    limit: number;
  };
}
