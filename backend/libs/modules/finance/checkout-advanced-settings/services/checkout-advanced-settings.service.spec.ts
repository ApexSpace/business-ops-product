import { Test, TestingModule } from '@nestjs/testing';
import { CheckoutAdvancedSettingsService } from './checkout-advanced-settings.service';
import { CheckoutAdvancedSettingsRepository } from '../repositories/checkout-advanced-settings.repository';
import { AuditService } from '@app/modules/platform/audit/services/audit.service';

describe('CheckoutAdvancedSettingsService', () => {
  let service: CheckoutAdvancedSettingsService;
  const repository = {
    ensureSettings: jest.fn(),
    update: jest.fn(),
  };
  const auditService = { log: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CheckoutAdvancedSettingsService,
        { provide: CheckoutAdvancedSettingsRepository, useValue: repository },
        { provide: AuditService, useValue: auditService },
      ],
    }).compile();
    service = module.get(CheckoutAdvancedSettingsService);
  });

  it('normalizes custom payment method names on update', async () => {
    repository.ensureSettings.mockResolvedValue({ id: 's1', businessId: 'b1' });
    repository.update.mockResolvedValue({
      id: 's1',
      businessId: 'b1',
      customPaymentMethodNames: ['PayPal', 'Venmo'],
      tipButtonPercents: [18, 20, 22],
      hideTipButtons: false,
      askClientsForTip: true,
      askForTipProductsOnly: false,
      askClientsForSignature: false,
      enableCheckPayments: false,
      showChangeCalculator: false,
      showReceiptPreview: false,
      requireStaffForServices: false,
      requireStaffForProducts: false,
      requireStaffForGiftCards: false,
      requireStaffForPackages: false,
      showServiceProviderOnReceipt: true,
      receiptCustomFooterText: null,
    });

    await service.update(
      'b1',
      { customPaymentMethodNames: [' PayPal ', 'paypal', 'Venmo'] },
      { id: 'u1', businessId: 'b1' } as never,
    );

    expect(repository.update).toHaveBeenCalledWith('b1', {
      customPaymentMethodNames: ['PayPal', 'Venmo'],
    });
  });
});
