export interface CurrencyDefinition {
  code: string;
  symbol: string;
}

export const SUPPORTED_CURRENCIES: CurrencyDefinition[] = [
  { code: 'USD', symbol: '$' },
  { code: 'EUR', symbol: '€' },
  { code: 'GBP', symbol: '£' },
  { code: 'CAD', symbol: 'CA$' },
  { code: 'AUD', symbol: 'A$' },
  { code: 'NZD', symbol: 'NZ$' },
  { code: 'JPY', symbol: '¥' },
  { code: 'CNY', symbol: '¥' },
  { code: 'INR', symbol: '₹' },
  { code: 'PKR', symbol: '₨' },
  { code: 'AED', symbol: 'د.إ' },
  { code: 'SAR', symbol: '﷼' },
  { code: 'CHF', symbol: 'CHF' },
  { code: 'SEK', symbol: 'kr' },
  { code: 'NOK', symbol: 'kr' },
  { code: 'DKK', symbol: 'kr' },
  { code: 'SGD', symbol: 'S$' },
  { code: 'HKD', symbol: 'HK$' },
  { code: 'MXN', symbol: 'MX$' },
  { code: 'BRL', symbol: 'R$' },
  { code: 'ZAR', symbol: 'R' },
];

const currencyByCode = new Map(
  SUPPORTED_CURRENCIES.map((c) => [c.code, c] as const),
);

export function currencySymbolForCode(code: string): string {
  const normalized = code.trim().toUpperCase();
  return currencyByCode.get(normalized)?.symbol ?? normalized;
}

export function normalizeCurrencyCode(code: string): string {
  const normalized = code.trim().toUpperCase();
  return currencyByCode.has(normalized) ? normalized : 'USD';
}

export function isSupportedCurrencyCode(code: string): boolean {
  return currencyByCode.has(code.trim().toUpperCase());
}
