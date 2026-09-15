import { ExpressDepositType, Prisma } from '@prisma/client';
import {
  assertValidExpressDepositPreferences,
  resolveExpressDeposit,
} from './express-deposit.util';

describe('express-deposit.util', () => {
  describe('resolveExpressDeposit', () => {
    it('charges full service price for FULL type', () => {
      const result = resolveExpressDeposit({
        depositType: ExpressDepositType.FULL,
        depositAmount: null,
        servicePrice: '100',
      });

      expect(result.chargeAmount.toString()).toBe('100');
      expect(result.isFullPayment).toBe(true);
      expect(result.remainingBalance.toString()).toBe('0');
    });

    it('charges percentage of service price', () => {
      const result = resolveExpressDeposit({
        depositType: ExpressDepositType.PERCENTAGE,
        depositAmount: 25,
        servicePrice: 200,
      });

      expect(result.chargeAmount.toString()).toBe('50');
      expect(result.isFullPayment).toBe(false);
      expect(result.remainingBalance.toString()).toBe('150');
    });

    it('charges fixed amount capped at service price', () => {
      const result = resolveExpressDeposit({
        depositType: ExpressDepositType.FIXED,
        depositAmount: 150,
        servicePrice: 100,
      });

      expect(result.chargeAmount.toString()).toBe('100');
      expect(result.isFullPayment).toBe(true);
      expect(result.remainingBalance.toString()).toBe('0');
    });
  });

  describe('assertValidExpressDepositPreferences', () => {
    it('requires percentage when partial deposit enabled', () => {
      expect(() =>
        assertValidExpressDepositPreferences({
          expressRequireDeposit: true,
          expressDepositType: ExpressDepositType.PERCENTAGE,
          expressDepositAmount: 0,
        }),
      ).toThrow();
    });

    it('allows full deposit without amount', () => {
      expect(() =>
        assertValidExpressDepositPreferences({
          expressRequireDeposit: true,
          expressDepositType: ExpressDepositType.FULL,
        }),
      ).not.toThrow();
    });
  });
});
