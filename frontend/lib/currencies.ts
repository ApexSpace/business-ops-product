export interface CurrencyOption {
  code: string;
  symbol: string;
  label: string;
}

export const CURRENCY_OPTIONS: CurrencyOption[] = [
  { code: "USD", symbol: "$", label: "USD — US Dollar" },
  { code: "EUR", symbol: "€", label: "EUR — Euro" },
  { code: "GBP", symbol: "£", label: "GBP — British Pound" },
  { code: "CAD", symbol: "CA$", label: "CAD — Canadian Dollar" },
  { code: "AUD", symbol: "A$", label: "AUD — Australian Dollar" },
  { code: "NZD", symbol: "NZ$", label: "NZD — New Zealand Dollar" },
  { code: "JPY", symbol: "¥", label: "JPY — Japanese Yen" },
  { code: "CNY", symbol: "¥", label: "CNY — Chinese Yuan" },
  { code: "INR", symbol: "₹", label: "INR — Indian Rupee" },
  { code: "PKR", symbol: "₨", label: "PKR — Pakistani Rupee" },
  { code: "AED", symbol: "د.إ", label: "AED — UAE Dirham" },
  { code: "SAR", symbol: "﷼", label: "SAR — Saudi Riyal" },
  { code: "CHF", symbol: "CHF", label: "CHF — Swiss Franc" },
  { code: "SEK", symbol: "kr", label: "SEK — Swedish Krona" },
  { code: "NOK", symbol: "kr", label: "NOK — Norwegian Krone" },
  { code: "DKK", symbol: "kr", label: "DKK — Danish Krone" },
  { code: "SGD", symbol: "S$", label: "SGD — Singapore Dollar" },
  { code: "HKD", symbol: "HK$", label: "HKD — Hong Kong Dollar" },
  { code: "MXN", symbol: "MX$", label: "MXN — Mexican Peso" },
  { code: "BRL", symbol: "R$", label: "BRL — Brazilian Real" },
  { code: "ZAR", symbol: "R", label: "ZAR — South African Rand" },
];

export const currencySelectOptions = CURRENCY_OPTIONS.map((c) => ({
  value: c.code,
  label: c.label,
}));

const currencyByCode = new Map(
  CURRENCY_OPTIONS.map((c) => [c.code, c] as const),
);

export function currencySymbolForCode(code: string): string {
  return currencyByCode.get(code)?.symbol ?? code;
}

export function normalizeCurrencyCode(code: string): string {
  const normalized = code.trim().toUpperCase();
  return currencyByCode.has(normalized) ? normalized : "USD";
}
