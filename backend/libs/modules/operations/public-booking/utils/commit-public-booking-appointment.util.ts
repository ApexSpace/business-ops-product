import { HttpStatus } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import type { CreatePrepaidCheckoutSaleParams } from '@app/modules/finance/payments/services/booking-link-sale.service';

export const PREPAID_SALE_RECORD_FAILED_MESSAGE =
  'Payment succeeded but sale could not be recorded. Please contact the business.';

type AppointmentCommitRecord = {
  id: string;
  metadata: Prisma.JsonValue | null;
};

export type CommitPublicBookingAppointmentParams<
  T extends AppointmentCommitRecord,
> = {
  appointmentRepository: {
    create: (
      businessId: string,
      data: Omit<Prisma.AppointmentUncheckedCreateInput, 'businessId'>,
      serviceLines?: Prisma.AppointmentServiceLineUncheckedCreateWithoutAppointmentInput[],
    ) => Promise<T>;
    update: (id: string, data: Prisma.AppointmentUpdateInput) => Promise<T>;
    softDelete: (id: string) => Promise<unknown>;
  };
  bookingLinkSale: {
    createPrepaidCheckoutSale: (
      params: CreatePrepaidCheckoutSaleParams,
    ) => Promise<{ checkoutId: string }>;
  };
  logger: { error: (message: string) => void };
  businessId: string;
  appointmentData: Omit<Prisma.AppointmentUncheckedCreateInput, 'businessId'>;
  serviceLines: Prisma.AppointmentServiceLineUncheckedCreateWithoutAppointmentInput[];
  prepaid: Omit<CreatePrepaidCheckoutSaleParams, 'appointmentId'> | null;
};

/**
 * Commits a public booking appointment and its service lines in one Prisma nested
 * write (atomic). Prepaid checkout attach stays on its own sale transaction; if
 * that fails, the appointment is soft-deleted before the existing 400 is thrown.
 */
export async function commitPublicBookingAppointment<
  T extends AppointmentCommitRecord,
>(params: CommitPublicBookingAppointmentParams<T>): Promise<T> {
  const appointment = await params.appointmentRepository.create(
    params.businessId,
    params.appointmentData,
    params.serviceLines,
  );

  if (!params.prepaid) {
    return appointment;
  }

  try {
    const sale = await params.bookingLinkSale.createPrepaidCheckoutSale({
      ...params.prepaid,
      appointmentId: appointment.id,
    });
    const previousMetadata =
      appointment.metadata && typeof appointment.metadata === 'object'
        ? (appointment.metadata as Record<string, unknown>)
        : {};
    await params.appointmentRepository.update(appointment.id, {
      metadata: {
        ...previousMetadata,
        prepaidCheckoutId: sale.checkoutId,
      },
    });
    return appointment;
  } catch (error) {
    params.logger.error(
      `Failed to create prepaid checkout sale for appointment ${appointment.id}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    try {
      await params.appointmentRepository.softDelete(appointment.id);
    } catch (compensateError) {
      params.logger.error(
        `Failed to compensate orphan public booking appointment ${appointment.id}: ${
          compensateError instanceof Error
            ? compensateError.message
            : String(compensateError)
        }`,
      );
    }
    throw new AppException(
      ErrorCode.BAD_REQUEST,
      PREPAID_SALE_RECORD_FAILED_MESSAGE,
      HttpStatus.BAD_REQUEST,
    );
  }
}
