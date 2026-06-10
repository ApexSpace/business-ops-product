import { Business, Prisma } from '@prisma/client';
import {
  BusinessFinancialSettings,
  BusinessInformationSettings,
  DEFAULT_FINANCIAL_SETTINGS,
  EstimateSettingsConfig,
  InvoiceSettingsConfig,
  TaxesAndCurrencySettings,
} from '../types/financial-settings.types';
import { currencySymbolForCode, normalizeCurrencyCode } from './currency.util';

const FINANCIAL_SETTINGS_KEY = 'financial';

export function formatDocumentNumber(prefix: string, sequence: number): string {
  const normalizedPrefix = prefix.trim().toUpperCase() || 'DOC';
  return `${normalizedPrefix}-${String(sequence).padStart(5, '0')}`;
}

export function parseDocumentSequence(
  documentNumber: string,
  prefix: string,
): number {
  const normalizedPrefix = prefix.trim().toUpperCase() || 'DOC';
  const escaped = normalizedPrefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = new RegExp(`^${escaped}-(\\d+)$`, 'i').exec(
    documentNumber.trim(),
  );
  if (!match) {
    return 0;
  }
  return parseInt(match[1], 10);
}

export function parsePaymentTermsDays(terms: string): number | null {
  const trimmed = terms.trim();
  if (!trimmed) {
    return null;
  }
  const netMatch = /net\s*(\d+)/i.exec(trimmed);
  if (netMatch) {
    return parseInt(netMatch[1], 10);
  }
  const daysMatch = /(\d+)\s*days?/i.exec(trimmed);
  if (daysMatch) {
    return parseInt(daysMatch[1], 10);
  }
  return null;
}

export function addDaysToDate(base: Date, days: number): Date {
  const result = new Date(base);
  result.setDate(result.getDate() + days);
  result.setHours(0, 0, 0, 0);
  return result;
}

export function computeDefaultTaxAmount(
  subtotal: number,
  taxRate: number,
  pricesIncludeTax: boolean,
): number {
  if (taxRate <= 0 || pricesIncludeTax) {
    return 0;
  }
  return Math.round(subtotal * (taxRate / 100) * 100) / 100;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function mergeSection<T extends object>(defaults: T, stored: unknown): T {
  if (!isRecord(stored)) {
    return { ...defaults };
  }
  return { ...defaults, ...(stored as Partial<T>) };
}

export function businessInformationFromProfile(
  business: Business,
): BusinessInformationSettings {
  const digits = (business.phoneNumber ?? '').replace(/\D/g, '');
  const phone =
    digits && business.phoneCountryCode
      ? `${business.phoneCountryCode}${digits}`
      : digits
        ? (business.phoneNumber ?? '')
        : '';

  const stored =
    isRecord(business.settings) &&
    isRecord(business.settings[FINANCIAL_SETTINGS_KEY]) &&
    isRecord(business.settings[FINANCIAL_SETTINGS_KEY].businessInformation)
      ? (business.settings[FINANCIAL_SETTINGS_KEY]
          .businessInformation as Record<string, unknown>)
      : null;

  return {
    legalBusinessName: business.name ?? '',
    displayBusinessName: business.displayName ?? business.name ?? '',
    logoUrl: typeof stored?.logoUrl === 'string' ? stored.logoUrl : '',
    email: business.email ?? '',
    phone,
    website: business.website ?? '',
    addressLine1: business.address ?? '',
    addressLine2:
      typeof stored?.addressLine2 === 'string' ? stored.addressLine2 : '',
    city: business.city ?? '',
    state: business.state ?? '',
    postalCode: business.zip ?? '',
    country: business.country ?? '',
  };
}

export function extractFinancialSettings(
  business: Business,
): BusinessFinancialSettings {
  const settings = business.settings;
  const stored =
    isRecord(settings) && isRecord(settings[FINANCIAL_SETTINGS_KEY])
      ? settings[FINANCIAL_SETTINGS_KEY]
      : {};

  const profileDefaults = businessInformationFromProfile(business);

  const storedBusinessInfo =
    isRecord(stored) && isRecord(stored.businessInformation)
      ? stored.businessInformation
      : null;

  const businessInformation: BusinessInformationSettings = {
    ...profileDefaults,
    logoUrl:
      typeof storedBusinessInfo?.logoUrl === 'string'
        ? storedBusinessInfo.logoUrl
        : profileDefaults.logoUrl,
    addressLine2:
      typeof storedBusinessInfo?.addressLine2 === 'string'
        ? storedBusinessInfo.addressLine2
        : profileDefaults.addressLine2,
  };

  const invoice = mergeSection(
    DEFAULT_FINANCIAL_SETTINGS.invoice,
    stored.invoice,
  );
  invoice.prefix = (invoice.prefix || DEFAULT_FINANCIAL_SETTINGS.invoice.prefix)
    .trim()
    .toUpperCase()
    .slice(0, 10);
  invoice.nextNumber = Math.max(1, Math.floor(Number(invoice.nextNumber) || 1));

  const estimate = mergeSection(
    DEFAULT_FINANCIAL_SETTINGS.estimate,
    stored.estimate,
  );
  estimate.prefix = (
    estimate.prefix || DEFAULT_FINANCIAL_SETTINGS.estimate.prefix
  )
    .trim()
    .toUpperCase()
    .slice(0, 10);
  estimate.nextNumber = Math.max(
    1,
    Math.floor(Number(estimate.nextNumber) || 1),
  );
  estimate.defaultExpiryDays = Math.max(
    1,
    Math.floor(Number(estimate.defaultExpiryDays) || 30),
  );

  const taxesAndCurrency = mergeSection(
    DEFAULT_FINANCIAL_SETTINGS.taxesAndCurrency,
    stored.taxesAndCurrency,
  );
  taxesAndCurrency.defaultTaxRate = Math.min(
    100,
    Math.max(0, Number(taxesAndCurrency.defaultTaxRate) || 0),
  );
  taxesAndCurrency.currencyCode = normalizeCurrencyCode(
    taxesAndCurrency.currencyCode,
  );
  taxesAndCurrency.currencySymbol = currencySymbolForCode(
    taxesAndCurrency.currencyCode,
  );

  return {
    businessInformation,
    invoice,
    estimate,
    taxesAndCurrency,
  };
}

export function mergeFinancialSettings(
  current: BusinessFinancialSettings,
  patch: Partial<BusinessFinancialSettings>,
): BusinessFinancialSettings {
  return {
    businessInformation: patch.businessInformation
      ? { ...current.businessInformation, ...patch.businessInformation }
      : current.businessInformation,
    invoice: patch.invoice
      ? { ...current.invoice, ...patch.invoice }
      : current.invoice,
    estimate: patch.estimate
      ? { ...current.estimate, ...patch.estimate }
      : current.estimate,
    taxesAndCurrency: patch.taxesAndCurrency
      ? { ...current.taxesAndCurrency, ...patch.taxesAndCurrency }
      : current.taxesAndCurrency,
  };
}

export function financialSettingsToJson(
  financial: BusinessFinancialSettings,
): Record<string, unknown> {
  return {
    businessInformation: {
      logoUrl: financial.businessInformation.logoUrl,
      addressLine2: financial.businessInformation.addressLine2,
    },
    invoice: financial.invoice,
    estimate: financial.estimate,
    taxesAndCurrency: financial.taxesAndCurrency,
  };
}

export function wrapFinancialSettings(
  existingSettings: unknown,
  financial: BusinessFinancialSettings,
): Prisma.InputJsonValue {
  const base = isRecord(existingSettings) ? { ...existingSettings } : {};
  return {
    ...base,
    [FINANCIAL_SETTINGS_KEY]: financialSettingsToJson(financial),
  } as Prisma.InputJsonValue;
}
