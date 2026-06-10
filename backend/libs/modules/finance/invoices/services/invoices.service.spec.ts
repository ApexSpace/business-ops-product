import { InvoiceStatus } from '@prisma/client';
import * as invoiceMapper from '../mappers/invoice.mapper';
import { InvoicesService } from './invoices.service';
import { buildInvoicePublicUrl } from '../utils/invoice-public-token.util';

function decimal(value: string) {
  return { toString: () => value };
}

function buildInvoiceMock(overrides: Record<string, unknown> = {}) {
  return {
    id: 'inv-1',
    businessId: 'biz-1',
    contactId: 'contact-1',
    invoiceNumber: 'INV-1001',
    totalAmount: decimal('250'),
    dueDate: new Date('2026-07-01'),
    publicToken: null,
    publicUrl: null,
    contact: {
      email: 'customer@example.com',
      displayName: 'Jane Customer',
    },
    ...overrides,
  };
}

describe('InvoicesService invoice.sent', () => {
  const businessId = 'biz-1';
  const frontendUrl = 'https://app.example.com';

  function buildService() {
    const emailNotificationService = {
      enqueueTransactionalEmail: jest.fn().mockResolvedValue(undefined),
    };
    const invoiceRepository = {
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn().mockImplementation(async () => buildInvoiceMock()),
    };
    const configService = {
      get: jest.fn((key: string) => {
        if (key === 'app.frontendUrl') return frontendUrl;
        return undefined;
      }),
    };

    const service = new InvoicesService(
      invoiceRepository as never,
      { findById: jest.fn() } as never,
      { findById: jest.fn() } as never,
      { findById: jest.fn() } as never,
      { findById: jest.fn() } as never,
      { log: jest.fn() } as never,
      {
        getSettingsForBusiness: jest.fn().mockResolvedValue({
          taxesAndCurrency: { currencyCode: 'USD' },
        }),
      } as never,
      emailNotificationService as never,
      { findById: jest.fn().mockResolvedValue({ name: 'Acme' }) } as never,
      configService as never,
    );

    return { service, emailNotificationService, invoiceRepository };
  }

  it('always builds invoice.sent public URL from FRONTEND_URL and publicToken', async () => {
    const publicToken = 'abc123token';
    const expectedUrl = buildInvoicePublicUrl(frontendUrl, publicToken);
    const { service, emailNotificationService } = buildService();

    await (
      service as unknown as {
        sendInvoiceSentEmail: (b: string, i: unknown) => Promise<void>;
      }
    ).sendInvoiceSentEmail(
      businessId,
      buildInvoiceMock({ publicToken, publicUrl: 'https://stale.example/old' }),
    );

    expect(
      emailNotificationService.enqueueTransactionalEmail,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        emailType: 'invoice.sent',
        idempotencyKey: 'invoice-sent-inv-1',
        variables: expect.objectContaining({
          'invoice.public_url': expectedUrl,
        }),
      }),
    );
  });

  it('triggers invoice.sent on updateStatus when status becomes SENT', async () => {
    const { service } = buildService();
    const sendSpy = jest
      .spyOn(
        service as unknown as {
          sendInvoiceSentEmail: (...args: unknown[]) => Promise<void>;
        },
        'sendInvoiceSentEmail',
      )
      .mockResolvedValue(undefined);
    jest
      .spyOn(invoiceMapper, 'toInvoiceResponse')
      .mockReturnValue({ id: 'inv-1' } as never);

    const { invoiceRepository } = buildService();
    (
      service as unknown as { invoiceRepository: typeof invoiceRepository }
    ).invoiceRepository = invoiceRepository;
    invoiceRepository.findById.mockResolvedValue(
      buildInvoiceMock({ status: InvoiceStatus.DRAFT }),
    );
    invoiceRepository.update.mockResolvedValue(
      buildInvoiceMock({ status: InvoiceStatus.SENT }),
    );

    await service.updateStatus(
      businessId,
      'inv-1',
      { status: InvoiceStatus.SENT },
      { id: 'user-1' } as never,
    );

    expect(sendSpy).toHaveBeenCalled();
    sendSpy.mockRestore();
    jest.restoreAllMocks();
  });

  it('triggers invoice.sent when create() uses SENT status', async () => {
    const { service, invoiceRepository } = buildService();
    const sendSpy = jest
      .spyOn(
        service as unknown as {
          sendInvoiceSentEmail: (...args: unknown[]) => Promise<void>;
        },
        'sendInvoiceSentEmail',
      )
      .mockResolvedValue(undefined);
    jest
      .spyOn(invoiceMapper, 'toInvoiceResponse')
      .mockReturnValue({ id: 'inv-new' } as never);

    (
      service as unknown as { contactRepository: { findById: jest.Mock } }
    ).contactRepository = {
      findById: jest.fn().mockResolvedValue({ id: 'contact-1' }),
    };
    (
      service as unknown as {
        financialSettingsService: Record<string, jest.Mock>;
      }
    ).financialSettingsService = {
      getSettingsForBusiness: jest.fn().mockResolvedValue({
        taxesAndCurrency: {
          currencyCode: 'USD',
          defaultTaxRate: 0,
          pricesIncludeTax: false,
        },
        invoice: {
          defaultPaymentTerms: 'Net 30',
          defaultNotes: '',
          defaultTermsAndConditions: '',
        },
      }),
      allocateInvoiceNumber: jest.fn().mockResolvedValue('INV-1002'),
    };
    invoiceRepository.create.mockResolvedValue({ id: 'inv-new' });
    invoiceRepository.findById.mockResolvedValue(
      buildInvoiceMock({ id: 'inv-new', status: InvoiceStatus.SENT }),
    );

    await service.create(
      businessId,
      {
        contactId: 'contact-1',
        items: [{ title: 'Service', quantity: 1, unitPrice: 100 }],
        status: InvoiceStatus.SENT,
      },
      { id: 'user-1' } as never,
    );

    expect(sendSpy).toHaveBeenCalled();
    sendSpy.mockRestore();
    jest.restoreAllMocks();
  });
});
