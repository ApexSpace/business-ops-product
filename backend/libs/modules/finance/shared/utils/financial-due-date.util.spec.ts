import { EstimateStatus, InvoiceStatus, Prisma } from '@prisma/client';
import {
  daysUntilDate,
  isEstimateExpired,
  isInvoiceOverdue,
  isPastDueDate,
  resolveEstimateDisplayStatus,
  resolveInvoiceDisplayStatus,
  startOfTodayUtc,
} from './financial-due-date.util';

describe('financial-due-date.util', () => {
  const ref = new Date('2026-06-06T15:00:00.000Z');

  describe('daysUntilDate', () => {
    it('returns 0 when due today', () => {
      expect(daysUntilDate(new Date('2026-06-06T12:00:00.000Z'), ref)).toBe(0);
    });

    it('returns positive days for future dates', () => {
      expect(daysUntilDate(new Date('2026-06-09T00:00:00.000Z'), ref)).toBe(3);
    });

    it('returns negative days for past dates', () => {
      expect(daysUntilDate(new Date('2026-06-04T00:00:00.000Z'), ref)).toBe(-2);
    });
  });

  describe('isInvoiceOverdue', () => {
    it('marks sent invoices with past due dates as overdue', () => {
      expect(
        isInvoiceOverdue({
          status: InvoiceStatus.SENT,
          dueDate: new Date('2026-06-04T00:00:00.000Z'),
          balanceDue: new Prisma.Decimal('100'),
        }),
      ).toBe(true);
    });

    it('ignores paid invoices even when due date passed', () => {
      expect(
        isInvoiceOverdue({
          status: InvoiceStatus.PAID,
          dueDate: new Date('2026-06-04T00:00:00.000Z'),
          balanceDue: new Prisma.Decimal('0'),
        }),
      ).toBe(false);
    });

    it('ignores sent invoices without a due date', () => {
      expect(
        isInvoiceOverdue({
          status: InvoiceStatus.SENT,
          dueDate: null,
          balanceDue: new Prisma.Decimal('100'),
        }),
      ).toBe(false);
    });
  });

  describe('resolveInvoiceDisplayStatus', () => {
    it('returns OVERDUE for partial invoices past due', () => {
      expect(
        resolveInvoiceDisplayStatus(
          InvoiceStatus.PARTIAL,
          new Date('2026-06-04T00:00:00.000Z'),
          new Prisma.Decimal('50'),
        ),
      ).toBe(InvoiceStatus.OVERDUE);
    });
  });

  describe('isEstimateExpired', () => {
    it('marks sent estimates with past expiry dates as expired', () => {
      expect(
        isEstimateExpired({
          status: EstimateStatus.SENT,
          expiryDate: new Date('2026-06-04T00:00:00.000Z'),
        }),
      ).toBe(true);
    });

    it('ignores approved estimates even when expiry date passed', () => {
      expect(
        isEstimateExpired({
          status: EstimateStatus.APPROVED,
          expiryDate: new Date('2026-06-04T00:00:00.000Z'),
        }),
      ).toBe(false);
    });
  });

  describe('resolveEstimateDisplayStatus', () => {
    it('returns EXPIRED for sent estimates past expiry', () => {
      expect(
        resolveEstimateDisplayStatus(
          EstimateStatus.SENT,
          new Date('2026-06-04T00:00:00.000Z'),
        ),
      ).toBe(EstimateStatus.EXPIRED);
    });
  });

  describe('startOfTodayUtc', () => {
    it('normalizes to midnight UTC', () => {
      const start = startOfTodayUtc(ref);
      expect(start.toISOString()).toBe('2026-06-06T00:00:00.000Z');
    });
  });

  describe('isPastDueDate', () => {
    it('treats yesterday as past due', () => {
      expect(isPastDueDate(new Date('2026-06-05T00:00:00.000Z'), ref)).toBe(
        true,
      );
    });

    it('treats today as not past due', () => {
      expect(isPastDueDate(new Date('2026-06-06T00:00:00.000Z'), ref)).toBe(
        false,
      );
    });
  });
});
