import { HttpStatus } from '@nestjs/common';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import {
  PREPAID_SALE_RECORD_FAILED_MESSAGE,
  commitPublicBookingAppointment,
} from './commit-public-booking-appointment.util';

describe('commitPublicBookingAppointment', () => {
  const appointmentData = {
    title: 'Facial',
    startAt: new Date('2026-09-14T15:00:00.000Z'),
    endAt: new Date('2026-09-14T16:00:00.000Z'),
    contactId: 'contact-1',
    serviceId: 'svc-1',
    metadata: { publicSlug: 'demo' },
  };
  const serviceLines = [
    {
      serviceId: 'svc-1',
      assignedToId: 'staff-1',
      startAt: new Date('2026-09-14T15:00:00.000Z'),
      durationMinutes: 60,
      price: 120,
      sortOrder: 0,
    },
  ];
  const prepaid = {
    businessId: 'biz-1',
    contactId: 'contact-1',
    serviceId: 'svc-1',
    serviceName: 'Facial',
    staffUserId: 'staff-1',
    amount: '120',
    paymentIntentId: 'pi_test',
  };

  function createDeps(overrides?: {
    createImpl?: jest.Mock;
    updateImpl?: jest.Mock;
    softDeleteImpl?: jest.Mock;
    saleImpl?: jest.Mock;
  }) {
    const appointmentRepository = {
      create: overrides?.createImpl ?? jest.fn(),
      update: overrides?.updateImpl ?? jest.fn(),
      softDelete: overrides?.softDeleteImpl ?? jest.fn(),
    };
    const bookingLinkSale = {
      createPrepaidCheckoutSale: overrides?.saleImpl ?? jest.fn(),
    };
    const logger = { error: jest.fn() };
    return { appointmentRepository, bookingLinkSale, logger };
  }

  it('creates the appointment with nested service lines in one write', async () => {
    const created = { id: 'apt-1', metadata: appointmentData.metadata };
    const { appointmentRepository, bookingLinkSale, logger } = createDeps({
      createImpl: jest.fn().mockResolvedValue(created),
    });

    const result = await commitPublicBookingAppointment({
      appointmentRepository,
      bookingLinkSale,
      logger,
      businessId: 'biz-1',
      appointmentData,
      serviceLines,
      prepaid: null,
    });

    expect(result).toBe(created);
    expect(appointmentRepository.create).toHaveBeenCalledTimes(1);
    expect(appointmentRepository.create).toHaveBeenCalledWith(
      'biz-1',
      appointmentData,
      serviceLines,
    );
    expect(bookingLinkSale.createPrepaidCheckoutSale).not.toHaveBeenCalled();
    expect(appointmentRepository.softDelete).not.toHaveBeenCalled();
  });

  it('writes resource assignments in the same nested create', async () => {
    const created = { id: 'apt-1', metadata: appointmentData.metadata };
    const { appointmentRepository, bookingLinkSale, logger } = createDeps({
      createImpl: jest.fn().mockResolvedValue(created),
    });
    const resourceAssignments = [{ resourceId: 'room-a', quantity: 1 }];

    await commitPublicBookingAppointment({
      appointmentRepository,
      bookingLinkSale,
      logger,
      businessId: 'biz-1',
      appointmentData,
      serviceLines,
      resourceAssignments,
      prepaid: null,
    });

    expect(appointmentRepository.create).toHaveBeenCalledWith(
      'biz-1',
      appointmentData,
      serviceLines,
      resourceAssignments,
    );
  });

  it('does not leave a live appointment when nested create fails after insert', async () => {
    const { appointmentRepository, bookingLinkSale, logger } = createDeps({
      createImpl: jest
        .fn()
        .mockRejectedValue(new Error('service line insert failed')),
    });

    await expect(
      commitPublicBookingAppointment({
        appointmentRepository,
        bookingLinkSale,
        logger,
        businessId: 'biz-1',
        appointmentData,
        serviceLines,
        prepaid,
      }),
    ).rejects.toThrow('service line insert failed');

    expect(bookingLinkSale.createPrepaidCheckoutSale).not.toHaveBeenCalled();
    expect(appointmentRepository.softDelete).not.toHaveBeenCalled();
    expect(appointmentRepository.update).not.toHaveBeenCalled();
  });

  it('soft-deletes the appointment before returning 400 when prepaid sale attach fails', async () => {
    const created = { id: 'apt-orphan', metadata: appointmentData.metadata };
    const { appointmentRepository, bookingLinkSale, logger } = createDeps({
      createImpl: jest.fn().mockResolvedValue(created),
      saleImpl: jest.fn().mockRejectedValue(new Error('invoice unique conflict')),
      softDeleteImpl: jest.fn().mockResolvedValue({ id: 'apt-orphan' }),
    });

    try {
      await commitPublicBookingAppointment({
        appointmentRepository,
        bookingLinkSale,
        logger,
        businessId: 'biz-1',
        appointmentData,
        serviceLines,
        prepaid,
      });
      throw new Error('expected prepaid attach failure');
    } catch (error) {
      expect(error).toBeInstanceOf(AppException);
      const exception = error as AppException;
      expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
      expect(exception.getResponse()).toEqual(
        expect.objectContaining({
          code: ErrorCode.BAD_REQUEST,
          message: PREPAID_SALE_RECORD_FAILED_MESSAGE,
        }),
      );
    }

    expect(bookingLinkSale.createPrepaidCheckoutSale).toHaveBeenCalledWith({
      ...prepaid,
      appointmentId: 'apt-orphan',
    });
    expect(appointmentRepository.softDelete).toHaveBeenCalledTimes(1);
    expect(appointmentRepository.softDelete).toHaveBeenCalledWith('apt-orphan');
    expect(appointmentRepository.update).not.toHaveBeenCalled();
    expect(
      appointmentRepository.create.mock.invocationCallOrder[0],
    ).toBeLessThan(appointmentRepository.softDelete.mock.invocationCallOrder[0]);
    expect(
      bookingLinkSale.createPrepaidCheckoutSale.mock.invocationCallOrder[0],
    ).toBeLessThan(appointmentRepository.softDelete.mock.invocationCallOrder[0]);
    expect(logger.error).toHaveBeenCalledWith(
      'Failed to create prepaid checkout sale for appointment apt-orphan: invoice unique conflict',
    );
  });

  it('still returns the same 400 if compensation soft-delete fails', async () => {
    const created = { id: 'apt-orphan', metadata: appointmentData.metadata };
    const { appointmentRepository, bookingLinkSale, logger } = createDeps({
      createImpl: jest.fn().mockResolvedValue(created),
      saleImpl: jest.fn().mockRejectedValue(new Error('sale failed')),
      softDeleteImpl: jest.fn().mockRejectedValue(new Error('soft-delete failed')),
    });

    await expect(
      commitPublicBookingAppointment({
        appointmentRepository,
        bookingLinkSale,
        logger,
        businessId: 'biz-1',
        appointmentData,
        serviceLines,
        prepaid,
      }),
    ).rejects.toBeInstanceOf(AppException);

    expect(appointmentRepository.softDelete).toHaveBeenCalledWith('apt-orphan');
    expect(logger.error).toHaveBeenCalledWith(
      'Failed to compensate orphan public booking appointment apt-orphan: soft-delete failed',
    );
  });

  it('attaches prepaidCheckoutId on success and does not compensate', async () => {
    const created = { id: 'apt-paid', metadata: { publicSlug: 'demo' } };
    const { appointmentRepository, bookingLinkSale, logger } = createDeps({
      createImpl: jest.fn().mockResolvedValue(created),
      saleImpl: jest.fn().mockResolvedValue({ checkoutId: 'inv-1' }),
      updateImpl: jest.fn().mockResolvedValue(created),
    });

    const result = await commitPublicBookingAppointment({
      appointmentRepository,
      bookingLinkSale,
      logger,
      businessId: 'biz-1',
      appointmentData,
      serviceLines,
      prepaid,
    });

    expect(result).toBe(created);
    expect(appointmentRepository.update).toHaveBeenCalledWith('apt-paid', {
      metadata: {
        publicSlug: 'demo',
        prepaidCheckoutId: 'inv-1',
      },
    });
    expect(appointmentRepository.softDelete).not.toHaveBeenCalled();
  });

  it('skips create when existingAppointment is provided and still attaches prepaid', async () => {
    const created = { id: 'apt-locked', metadata: appointmentData.metadata };
    const { appointmentRepository, bookingLinkSale, logger } = createDeps({
      saleImpl: jest.fn().mockResolvedValue({ checkoutId: 'inv-locked' }),
      updateImpl: jest.fn().mockResolvedValue(created),
    });

    const result = await commitPublicBookingAppointment({
      appointmentRepository,
      bookingLinkSale,
      logger,
      businessId: 'biz-1',
      appointmentData,
      serviceLines,
      existingAppointment: created,
      prepaid,
    });

    expect(result).toBe(created);
    expect(appointmentRepository.create).not.toHaveBeenCalled();
    expect(bookingLinkSale.createPrepaidCheckoutSale).toHaveBeenCalledWith({
      ...prepaid,
      appointmentId: 'apt-locked',
    });
    expect(appointmentRepository.update).toHaveBeenCalledWith('apt-locked', {
      metadata: {
        publicSlug: 'demo',
        prepaidCheckoutId: 'inv-locked',
      },
    });
  });
});
