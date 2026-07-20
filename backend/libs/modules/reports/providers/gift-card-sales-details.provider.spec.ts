import { GiftCardSource, InvoiceLineType, InvoiceStatus } from '@prisma/client';
import { GiftCardSalesDetailsProvider } from './gift-card-sales-details.provider';

describe('GiftCardSalesDetailsProvider', () => {
  const businessId = 'biz-1';
  const context = {
    businessName: 'Acme Spa',
    timezone: 'America/New_York',
    currency: 'USD',
    generatedAt: new Date('2026-07-20T12:00:00.000Z'),
  };

  const filters = {
    dateRange: 'custom',
    fromDate: '2026-07-01',
    toDate: '2026-07-31',
  };

  function makePrisma(cards: unknown[]) {
    return {
      giftCard: {
        findMany: jest.fn().mockResolvedValue(cards),
      },
    } as never;
  }

  it('builds Mangomint-style detail columns with value vs price', async () => {
    const prisma = makePrisma([
      {
        id: 'gc-1',
        number: 'GC-1001',
        notes: 'checkoutItem:item-1',
        initialValue: 100,
        ownerContactId: 'owner-1',
        createdAt: new Date('2026-07-10T16:00:00.000Z'),
        promotion: {
          name: 'Holiday Promo',
          salePrice: 80,
          cardValue: 100,
        },
        purchasingContact: {
          displayName: 'John Buyer',
          firstName: 'John',
          lastName: 'Buyer',
        },
        ownerContact: {
          displayName: 'Jane Owner',
          firstName: 'Jane',
          lastName: 'Owner',
        },
        invoice: {
          displaySequence: 42,
          closedAt: new Date('2026-07-10T16:00:00.000Z'),
          issueDate: new Date('2026-07-10T16:00:00.000Z'),
          contact: {
            displayName: 'John Buyer',
            firstName: 'John',
            lastName: 'Buyer',
          },
          closedBy: { firstName: 'Alex', lastName: 'Smith' },
          items: [
            {
              id: 'item-1',
              totalPrice: 80,
              unitPrice: 100,
              metadata: {
                cardValue: 100,
                ownerContactId: 'owner-1',
              },
              staffUser: { firstName: 'Sam', lastName: 'Lee' },
            },
          ],
        },
      },
    ]);

    const provider = new GiftCardSalesDetailsProvider(prisma);
    const doc = await provider.generate(businessId, filters, context);

    const section = doc.sections[0]!;
    expect(section.columns.map((column) => column.key)).toEqual([
      'saleNumber',
      'saleDate',
      'client',
      'giftCardNumber',
      'promotion',
      'giftCardValue',
      'price',
      'soldByStaff',
    ]);

    const dataRow = section.rows[0]!;
    expect(dataRow.cells.saleNumber).toBe('42');
    expect(dataRow.cells.client).toBe('John Buyer');
    expect(dataRow.cells.giftCardNumber).toBe('GC-1001');
    expect(dataRow.cells.promotion).toBe('Holiday Promo');
    expect(dataRow.cells.giftCardValue).toBe(100);
    expect(dataRow.cells.price).toBe(80);
    expect(dataRow.cells.soldByStaff).toBe('Sam Lee');
  });

  it('loads only sold gift cards in the selected period', async () => {
    const prisma = makePrisma([]);
    const provider = new GiftCardSalesDetailsProvider(prisma);
    await provider.generate(businessId, filters, context);

    expect(prisma.giftCard.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          source: {
            in: [GiftCardSource.POS_SALE, GiftCardSource.ONLINE_PURCHASE],
          },
        }),
      }),
    );

    const where = (prisma.giftCard.findMany as jest.Mock).mock.calls[0][0]
      .where;
    expect(where.OR).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          invoice: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({
                status: {
                  in: [InvoiceStatus.PAID, InvoiceStatus.PARTIAL],
                },
              }),
            ]),
          }),
        }),
        expect.objectContaining({
          invoiceId: null,
          source: GiftCardSource.ONLINE_PURCHASE,
        }),
      ]),
    );
    expect(InvoiceLineType.GIFT_CARD).toBe('GIFT_CARD');
  });
});
