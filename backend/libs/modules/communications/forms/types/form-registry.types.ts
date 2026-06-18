export type FormFieldRole = 'input' | 'layout' | 'choice' | 'composite';

export type FormFieldImplementationStatus = 'implemented' | 'planned' | 'stub';

export interface FormFieldCategoryDefinition {
  key: string;
  label: string;
  description: string;
  sortOrder: number;
  icon?: string;
}

export interface FormFieldDefinition {
  key: string;
  category: string;
  label: string;
  description: string;
  icon?: string;
  role: FormFieldRole;
  implementationStatus: FormFieldImplementationStatus;
  /** Included in submission validation and field counts */
  countsAsInput: boolean;
  supportsOptions: boolean;
  supportsValidation: boolean;
  supportsPlaceholder: boolean;
  supportsLabel: boolean;
  supportsInputStyle: boolean;
  supportsLabelStyle: boolean;
  supportsLayout: boolean;
}
