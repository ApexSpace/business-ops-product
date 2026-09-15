import type { ContactPaymentMethod } from '@prisma/client';
import type { ContactPaymentMethodResponseDto } from '../dto/contact-payment-method.dto';

export function toContactPaymentMethodResponse(
  row: ContactPaymentMethod,
): ContactPaymentMethodResponseDto {
  return {
    id: row.id,
    brand: row.brand,
    last4: row.last4,
    expMonth: row.expMonth,
    expYear: row.expYear,
    isDefault: row.isDefault,
  };
}
