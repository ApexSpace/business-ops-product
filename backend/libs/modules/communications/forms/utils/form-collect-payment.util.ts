import type { FormDefinitionView } from '../utils/form-definition.util';

export type CollectPaymentField = {
  id: string;
  type: 'collect_payment';
  name: string;
  label?: string;
  amount: number;
  currency: string;
};

export function flattenFormFields(fields: unknown[]): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [];
  for (const item of fields) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
    const field = item as Record<string, unknown>;
    out.push(field);
    if (field.type === 'columns' && Array.isArray(field.columns)) {
      for (const column of field.columns) {
        if (Array.isArray(column)) {
          out.push(...flattenFormFields(column));
        }
      }
    }
  }
  return out;
}

export function findCollectPaymentFields(
  fields: unknown[],
): CollectPaymentField[] {
  return flattenFormFields(fields)
    .filter((field) => field.type === 'collect_payment')
    .map((field) => {
      const amountRaw = field.amount;
      const amount =
        typeof amountRaw === 'number'
          ? amountRaw
          : typeof amountRaw === 'string'
            ? Number(amountRaw)
            : NaN;
      const currency =
        typeof field.currency === 'string' && field.currency.trim()
          ? field.currency.trim().toUpperCase()
          : 'USD';
      return {
        id: String(field.id),
        type: 'collect_payment' as const,
        name: typeof field.name === 'string' ? field.name : 'payment',
        label: typeof field.label === 'string' ? field.label : undefined,
        amount,
        currency,
      };
    })
    .filter((field) => Number.isFinite(field.amount) && field.amount > 0);
}

export function getSingleCollectPaymentField(
  definition: FormDefinitionView,
): CollectPaymentField | null {
  const fields = findCollectPaymentFields(definition.fields);
  return fields[0] ?? null;
}

export function amountToCents(amount: number): number {
  return Math.round(amount * 100);
}

export function extractPayerFromFormData(
  fields: unknown[],
  data: Record<string, unknown>,
): { email?: string; phone?: string; name?: string } {
  let email: string | undefined;
  let phone: string | undefined;
  let firstName: string | undefined;
  let lastName: string | undefined;
  let fullName: string | undefined;

  for (const field of flattenFormFields(fields)) {
    const name = typeof field.name === 'string' ? field.name : '';
    if (!name) continue;
    const type = field.type;
    if (type === 'email' && typeof data[name] === 'string' && !email) {
      email = (data[name] as string).trim() || undefined;
    }
    if (type === 'phone' && typeof data[name] === 'string' && !phone) {
      phone = (data[name] as string).trim() || undefined;
    }
    if (type === 'name') {
      const first = data[`${name}_first`];
      const last = data[`${name}_last`];
      if (typeof first === 'string' && first.trim()) firstName = first.trim();
      if (typeof last === 'string' && last.trim()) lastName = last.trim();
    }
    if (
      (type === 'text' || type === 'name') &&
      typeof data[name] === 'string' &&
      !fullName
    ) {
      const value = (data[name] as string).trim();
      if (value) fullName = value;
    }
  }

  const name =
    [firstName, lastName].filter(Boolean).join(' ').trim() ||
    fullName ||
    undefined;

  return { email, phone, name };
}
