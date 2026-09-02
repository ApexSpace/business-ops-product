import { CustomFee } from '@prisma/client';
import type { CustomFeeResponseDto } from '../dto/custom-fee-response.dto';

export function toCustomFeeResponse(fee: CustomFee): CustomFeeResponseDto {
  return {
    id: fee.id,
    businessId: fee.businessId,
    name: fee.name,
    applicationScope: fee.applicationScope,
    paymentMethods: fee.paymentMethods,
    amountType: fee.amountType,
    amount: fee.amount.toString(),
    isEnabled: fee.isEnabled,
    sortOrder: fee.sortOrder,
    createdAt: fee.createdAt.toISOString(),
    updatedAt: fee.updatedAt.toISOString(),
  };
}
