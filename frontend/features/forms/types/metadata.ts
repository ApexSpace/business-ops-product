export type FormFieldRole = "input" | "layout" | "choice" | "composite";

export type FormFieldImplementationStatus = "implemented" | "planned" | "stub";

export interface FormFieldCategory {
  key: string;
  label: string;
  description: string;
  sortOrder: number;
  icon?: string;
}

export interface FormFieldTypeMetadata {
  key: string;
  category: string;
  label: string;
  description: string;
  icon?: string;
  role: FormFieldRole;
  implementationStatus: FormFieldImplementationStatus;
  countsAsInput: boolean;
  supportsOptions: boolean;
  supportsValidation: boolean;
  supportsPlaceholder: boolean;
  supportsLabel: boolean;
  supportsInputStyle: boolean;
  supportsLabelStyle: boolean;
  supportsLayout: boolean;
}

export interface FormPaletteCategory extends FormFieldCategory {
  fields: FormFieldTypeMetadata[];
}

export interface FormMetadataFilters {
  categories?: string;
  status?: FormFieldImplementationStatus;
  search?: string;
}
