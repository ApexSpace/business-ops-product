import { Prisma, ServiceCommissionType } from '@prisma/client';

export type ServiceDetailsPatch = {
  durationMinutes?: number;
  hasProcessingTime?: boolean;
  processingDurationMinutes?: number;
  finishDurationMinutes?: number | null;
  hasBufferTime?: boolean;
  bufferBeforeMinutes?: number;
  bufferAfterMinutes?: number;
  usesProducts?: boolean;
  requiresNoStaff?: boolean;
  requiresTwoStaff?: boolean;
  hasCommissionDeduction?: boolean;
  commissionDeductionType?: ServiceCommissionType | null;
  commissionDeductionValue?: number | null;
  postCommissionDeductionType?: ServiceCommissionType | null;
  postCommissionDeductionValue?: number | null;
};

export function normalizeServiceDetailsPatch(
  existing: {
    durationMinutes: number;
    hasProcessingTime: boolean;
    processingDurationMinutes: number;
    finishDurationMinutes: number | null;
    hasBufferTime: boolean;
    bufferBeforeMinutes: number;
    bufferAfterMinutes: number;
    usesProducts: boolean;
    requiresNoStaff: boolean;
    requiresTwoStaff: boolean;
    hasCommissionDeduction: boolean;
    commissionDeductionType: ServiceCommissionType | null;
    commissionDeductionValue: Prisma.Decimal | null;
    postCommissionDeductionType: ServiceCommissionType | null;
    postCommissionDeductionValue: Prisma.Decimal | null;
  },
  patch: ServiceDetailsPatch,
): Prisma.ServiceUpdateInput {
  const hasProcessingTime =
    patch.hasProcessingTime ?? existing.hasProcessingTime;
  const hasBufferTime = patch.hasBufferTime ?? existing.hasBufferTime;
  const requiresNoStaff = patch.requiresNoStaff ?? existing.requiresNoStaff;
  const requiresTwoStaff = patch.requiresTwoStaff ?? existing.requiresTwoStaff;
  const hasCommissionDeduction =
    patch.hasCommissionDeduction ?? existing.hasCommissionDeduction;

  if (requiresNoStaff && requiresTwoStaff) {
    throw new Error('STAFFING_CONFLICT');
  }

  const processingDurationMinutes = hasProcessingTime
    ? (patch.processingDurationMinutes ?? existing.processingDurationMinutes)
    : 0;
  const finishDurationMinutes = hasProcessingTime
    ? patch.finishDurationMinutes !== undefined
      ? patch.finishDurationMinutes
      : existing.finishDurationMinutes
    : null;
  const bufferBeforeMinutes = hasBufferTime
    ? (patch.bufferBeforeMinutes ?? existing.bufferBeforeMinutes)
    : 0;
  const bufferAfterMinutes = hasBufferTime
    ? (patch.bufferAfterMinutes ?? existing.bufferAfterMinutes)
    : 0;

  let commissionDeductionType: ServiceCommissionType | null =
    patch.commissionDeductionType !== undefined
      ? patch.commissionDeductionType
      : existing.commissionDeductionType;
  let commissionDeductionValue: Prisma.Decimal | null =
    patch.commissionDeductionValue !== undefined
      ? patch.commissionDeductionValue === null
        ? null
        : new Prisma.Decimal(patch.commissionDeductionValue)
      : existing.commissionDeductionValue;

  let postCommissionDeductionType: ServiceCommissionType | null =
    patch.postCommissionDeductionType !== undefined
      ? patch.postCommissionDeductionType
      : existing.postCommissionDeductionType;
  let postCommissionDeductionValue: Prisma.Decimal | null =
    patch.postCommissionDeductionValue !== undefined
      ? patch.postCommissionDeductionValue === null
        ? null
        : new Prisma.Decimal(patch.postCommissionDeductionValue)
      : existing.postCommissionDeductionValue;

  if (!hasCommissionDeduction) {
    commissionDeductionType = null;
    commissionDeductionValue = null;
    postCommissionDeductionType = null;
    postCommissionDeductionValue = null;
  }

  return {
    durationMinutes: patch.durationMinutes ?? existing.durationMinutes,
    hasProcessingTime,
    processingDurationMinutes,
    finishDurationMinutes,
    hasBufferTime,
    bufferBeforeMinutes,
    bufferAfterMinutes,
    usesProducts: patch.usesProducts ?? existing.usesProducts,
    requiresNoStaff,
    requiresTwoStaff,
    hasCommissionDeduction,
    commissionDeductionType,
    commissionDeductionValue,
    postCommissionDeductionType,
    postCommissionDeductionValue,
  };
}
