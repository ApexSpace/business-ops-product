import { HttpStatus, Injectable } from '@nestjs/common';
import { ContactWalletTransactionType, Prisma } from '@prisma/client';
import { RequestUser } from '@app/common/decorators/current-user.decorator';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { PrismaService } from '@app/core/database/prisma.service';
import { AuditService } from '@app/modules/platform/audit/services/audit.service';
import { AdjustContactWalletDto } from '../dto/adjust-contact-wallet.dto';
import { ContactWalletResponseDto } from '../dto/contact-wallet-response.dto';
import { ContactRepository } from '../repositories/contact.repository';
import { ContactWalletRepository } from '../repositories/contact-wallet.repository';

@Injectable()
export class ContactWalletService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly contactRepository: ContactRepository,
    private readonly walletRepository: ContactWalletRepository,
    private readonly auditService: AuditService,
  ) {}

  async getWallet(
    businessId: string,
    contactId: string,
  ): Promise<ContactWalletResponseDto> {
    await this.assertContact(businessId, contactId);
    const balanceRow = await this.ensureBalance(businessId, contactId);
    const transactions = await this.walletRepository.listTransactions(
      businessId,
      contactId,
      50,
    );

    return {
      balance: {
        amount: balanceRow.balance.toFixed(2),
        currency: balanceRow.currency,
      },
      transactions: transactions.map((row) => ({
        id: row.id,
        amount: row.amount.toFixed(2),
        type: row.type,
        description: row.description,
        createdAt: row.createdAt,
      })),
      paymentMethods: [],
      giftCards: [],
      capabilities: {
        paymentMethods: false,
        giftCards: false,
      },
    };
  }

  async adjustBalance(
    businessId: string,
    contactId: string,
    dto: AdjustContactWalletDto,
    actor: RequestUser,
  ): Promise<ContactWalletResponseDto> {
    await this.assertContact(businessId, contactId);

    const signedAmount =
      dto.type === ContactWalletTransactionType.MANUAL_DEBIT
        ? new Prisma.Decimal(dto.amount).negated()
        : new Prisma.Decimal(dto.amount);

    await this.prisma.$transaction(async (tx) => {
      let balanceRow = await tx.contactWalletBalance.findFirst({
        where: { businessId, contactId },
      });
      if (!balanceRow) {
        balanceRow = await tx.contactWalletBalance.create({
          data: { businessId, contactId },
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

      await tx.contactWalletTransaction.create({
        data: {
          businessId,
          contactId,
          amount: signedAmount,
          type: dto.type,
          description: dto.description?.trim() || null,
          createdById: actor.id,
        },
      });
    });

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'contact.wallet.adjusted',
      entityType: 'Contact',
      entityId: contactId,
      metadata: {
        amount: dto.amount,
        type: dto.type,
        description: dto.description,
      },
    });

    return this.getWallet(businessId, contactId);
  }

  private async ensureBalance(businessId: string, contactId: string) {
    const existing = await this.walletRepository.findBalance(
      businessId,
      contactId,
    );
    if (existing) return existing;
    return this.walletRepository.createBalance(businessId, contactId);
  }

  private async assertContact(businessId: string, contactId: string) {
    const contact = await this.contactRepository.findById(businessId, contactId);
    if (!contact) {
      throw new AppException(
        ErrorCode.CONTACT_NOT_FOUND,
        'Contact not found',
        HttpStatus.NOT_FOUND,
      );
    }
    return contact;
  }
}
