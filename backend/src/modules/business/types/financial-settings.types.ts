export interface BusinessInformationSettings {
  legalBusinessName: string;
  displayBusinessName: string;
  logoUrl: string;
  email: string;
  phone: string;
  website: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface InvoiceSettingsConfig {
  prefix: string;
  nextNumber: number;
  defaultPaymentTerms: string;
  defaultNotes: string;
  defaultTermsAndConditions: string;
  showLogo: boolean;
  showBusinessAddress: boolean;
  showPaymentInstructions: boolean;
}

export interface EstimateSettingsConfig {
  prefix: string;
  nextNumber: number;
  defaultExpiryDays: number;
  defaultNotes: string;
  defaultTermsAndConditions: string;
  showLogo: boolean;
  showBusinessAddress: boolean;
}

export interface TaxesAndCurrencySettings {
  currencyCode: string;
  currencySymbol: string;
  defaultTaxRate: number;
  pricesIncludeTax: boolean;
}

export interface BusinessFinancialSettings {
  businessInformation: BusinessInformationSettings;
  invoice: InvoiceSettingsConfig;
  estimate: EstimateSettingsConfig;
  taxesAndCurrency: TaxesAndCurrencySettings;
}

export const DEFAULT_BUSINESS_INFORMATION: BusinessInformationSettings = {
  legalBusinessName: '',
  displayBusinessName: '',
  logoUrl: '',
  email: '',
  phone: '',
  website: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  postalCode: '',
  country: '',
};

export const DEFAULT_INVOICE_SETTINGS: InvoiceSettingsConfig = {
  prefix: 'INV',
  nextNumber: 1,
  defaultPaymentTerms: '',
  defaultNotes: '',
  defaultTermsAndConditions: '',
  showLogo: true,
  showBusinessAddress: true,
  showPaymentInstructions: true,
};

export const DEFAULT_ESTIMATE_SETTINGS: EstimateSettingsConfig = {
  prefix: 'EST',
  nextNumber: 1,
  defaultExpiryDays: 30,
  defaultNotes: '',
  defaultTermsAndConditions: '',
  showLogo: true,
  showBusinessAddress: true,
};

export const DEFAULT_TAXES_AND_CURRENCY: TaxesAndCurrencySettings = {
  currencyCode: 'USD',
  currencySymbol: '$',
  defaultTaxRate: 0,
  pricesIncludeTax: false,
};

export const DEFAULT_FINANCIAL_SETTINGS: BusinessFinancialSettings = {
  businessInformation: DEFAULT_BUSINESS_INFORMATION,
  invoice: DEFAULT_INVOICE_SETTINGS,
  estimate: DEFAULT_ESTIMATE_SETTINGS,
  taxesAndCurrency: DEFAULT_TAXES_AND_CURRENCY,
};
