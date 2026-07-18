import {
  InvoiceKind,
  InvoiceStatus,
  Prisma,
} from '@prisma/client';
import { BookingLinkSaleService } from './booking-link-sale.service';

describe('BookingLinkSaleService', () => {
  const prisma = {
    payment: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    invoice: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  const financialSettingsService = {
    allocateCheckoutNumber: jest.fn().mockResolvedValue({
      invoiceNumber: 'S-1001',
      displaySequence: 1001,
    }),
  };

  const service = new BookingLinkSaleService(
    prisma as never,
    financialSettingsService as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns existing payment invoice when PI already recorded', async () => {
    prisma.payment.findFirst.mockResolvedValue({ invoiceId: 'inv-1' });

    const result = await service.createPrepaidCheckoutSale({
      businessId: 'biz-1',
      appointmentId: 'apt-1',
      contactId: 'contact-1',
      serviceId: 'svc-1',
      serviceName: 'Facial',
      amount: '50.00',
      paymentIntentId: 'pi_1',
    });

    expect(result).toEqual({ checkoutId: 'inv-1' });
    expect(prisma.invoice.findFirst).not.toHaveBeenCalled();
  });

  it('returns existing PAID checkout for appointment', async () => {
    prisma.payment.findFirst.mockResolvedValue(null);
    prisma.invoice.findFirst.mockResolvedValue({ id: 'inv-paid' });

    const result = await service.createPrepaidCheckoutSale({
      businessId: 'biz-1',
      appointmentId: 'apt-1',
      contactId: 'contact-1',
      serviceId: 'svc-1',
      serviceName: 'Facial',
      amount: '50.00',
      paymentIntentId: 'pi_2',
    });

    expect(result).toEqual({ checkoutId: 'inv-paid' });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('creates PAID checkout + payment when none exist', async () => {
    prisma.payment.findFirst.mockResolvedValue(null);
    prisma.invoice.findFirst.mockResolvedValue(null);
    prisma.$transaction.mockImplementation(async (fn) => {
      const tx = {
        invoice: {
          create: jest.fn().mockResolvedValue({
            id: 'inv-new',
            kind: InvoiceKind.CHECKOUT,
            status: InvoiceStatus.PAID,
          }),
        },
        payment: {
          create: jest.fn().mockResolvedValue({ id: 'pay-1' }),
        },
      };
      return fn(tx);
    });

    const result = await service.createPrepaidCheckoutSale({
      businessId: 'biz-1',
      appointmentId: 'apt-1',
      contactId: 'contact-1',
      serviceId: 'svc-1',
      serviceName: 'Facial',
      staffUserId: 'staff-1',
      amount: new Prisma.Decimal('80'),
      paymentIntentId: 'pi_3',
      currency: 'USD',
    });

    expect(result).toEqual({ checkoutId: 'inv-new' });
    expect(financialSettingsService.allocateCheckoutNumber).toHaveBeenCalledWith(
      'biz-1',
    );
    expect(prisma.$transaction).toHaveBeenCalled();
  });
});
