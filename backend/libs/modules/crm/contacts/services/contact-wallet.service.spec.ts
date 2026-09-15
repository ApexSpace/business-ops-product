import { ContactWalletTransactionType, Prisma } from '@prisma/client';
import { ContactWalletService } from './contact-wallet.service';

describe('ContactWalletService', () => {
  const businessId = 'biz-1';
  const contactId = 'contact-1';
  const actor = { id: 'user-1', businessId } as never;

  let service: ContactWalletService;
  let contactRepository: { findById: jest.Mock };
  let walletRepository: {
    findBalance: jest.Mock;
    createBalance: jest.Mock;
    listTransactions: jest.Mock;
  };
  let prisma: { $transaction: jest.Mock };
  let auditService: { log: jest.Mock };

  beforeEach(() => {
    contactRepository = {
      findById: jest.fn().mockResolvedValue({ id: contactId }),
    };
    walletRepository = {
      findBalance: jest.fn(),
      createBalance: jest.fn(),
      listTransactions: jest.fn().mockResolvedValue([]),
    };
    prisma = {
      giftCard: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      $transaction: jest.fn(async (fn) =>
        fn({
          contactWalletBalance: {
            findFirst: jest.fn().mockResolvedValue({
              id: 'bal-1',
              balance: new Prisma.Decimal(10),
            }),
            create: jest.fn(),
            update: jest.fn(),
          },
          contactWalletTransaction: {
            create: jest.fn(),
          },
        }),
      ),
    };
    auditService = { log: jest.fn() };

    service = new ContactWalletService(
      prisma as never,
      contactRepository as never,
      walletRepository as never,
      auditService as never,
    );
  });

  it('creates balance on first wallet read', async () => {
    walletRepository.findBalance.mockResolvedValue(null);
    walletRepository.createBalance.mockResolvedValue({
      balance: new Prisma.Decimal(0),
      currency: 'USD',
    });

    const result = await service.getWallet(businessId, contactId);

    expect(walletRepository.createBalance).toHaveBeenCalledWith(
      businessId,
      contactId,
    );
    expect(result.balance.amount).toBe('0.00');
    expect(result.capabilities.paymentMethods).toBe(false);
  });

  it('adjusts wallet balance and logs audit', async () => {
    walletRepository.findBalance.mockResolvedValue({
      balance: new Prisma.Decimal(5),
      currency: 'USD',
    });

    const result = await service.adjustBalance(
      businessId,
      contactId,
      {
        amount: 2,
        type: ContactWalletTransactionType.MANUAL_CREDIT,
      },
      actor,
    );

    expect(prisma.$transaction).toHaveBeenCalled();
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'contact.wallet.adjusted' }),
    );
    expect(result.capabilities.giftCards).toBe(true);
  });
});
