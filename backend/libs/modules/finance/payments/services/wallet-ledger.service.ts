import { HttpStatus, Injectable } from '@nestjs/common';
import {
  ContactWalletTransactionType,
  Prisma,
} from '@prisma/client';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { PrismaService } from '@app/core/database/prisma.service';

export interface WalletDeltaInput {
  businessId: string;
  contactId: string;
  amount: Prisma.Decimal;
  type: ContactWalletTransactionType;
  description?: string | null;
  paymentId?: string;
  invoiceId?: string;
  createdById?: string;
}

@Injectable()
export class WalletLedgerService {
  constructor(private readonly prisma: PrismaService) {}

  async debit(input: WalletDeltaInput): Promise<string> {
    if (input.amount.greaterThan(0)) {
      return this.applyDelta(input.amount.negated(), input);
    }
    return this.applyDelta(input.amount, input);
  }

  async credit(input: WalletDeltaInput): Promise<string> {
    const amount = input.amount.lessThan(0) ? input.amount.negated() : input.amount;
    return this.applyDelta(amount, { ...input, amount });
  }

  private async applyDelta(
    signedAmount: Prisma.Decimal,
    input: WalletDeltaInput,
  ): Promise<string> {
    return this.prisma.$transaction(async (tx) => {
      let balanceRow = await tx.contactWalletBalance.findFirst({
        where: { businessId: input.businessId, contactId: input.contactId },
      });
      if (!balanceRow) {
        balanceRow = await tx.contactWalletBalance.create({
          data: { businessId: input.businessId, contactId: input.contactId },
        });
      }

      const nextBalance = balanceRow.balance.add(signedAmount);
      if (nextBalance.lessThan(0)) {
        throw new AppException(
          ErrorCode.BAD_REQUEST,
          'Insufficient wallet balance',
          HttpStatus.BAD_REQUEST,
        );
      }

      await tx.contactWalletBalance.update({
        where: { id: balanceRow.id },
        data: { balance: nextBalance },
      });

      const txRow = await tx.contactWalletTransaction.create({
        data: {
          businessId: input.businessId,
          contactId: input.contactId,
          amount: signedAmount,
          type: input.type,
          description: input.description?.trim() || null,
          paymentId: input.paymentId ?? null,
          invoiceId: input.invoiceId ?? null,
          createdById: input.createdById ?? null,
        },
      });

      return txRow.id;
    });
  }
}
