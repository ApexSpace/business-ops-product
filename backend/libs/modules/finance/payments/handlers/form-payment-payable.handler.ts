import { Injectable, OnModuleInit } from '@nestjs/common';
import { PayableType } from '@prisma/client';
import { PrismaService } from '@app/core/database/prisma.service';
import { PayableHandlerRegistry } from '../registry/payable-handler.registry';
import type {
  PayableHandler,
  PayableSnapshot,
  PaymentCompleteContext,
} from '../types/payable.types';

@Injectable()
export class FormPaymentPayableHandler
  implements PayableHandler, OnModuleInit
{
  readonly payableType = PayableType.FORM_PAYMENT;

  constructor(
    private readonly registry: PayableHandlerRegistry,
    private readonly prisma: PrismaService,
  ) {}

  onModuleInit(): void {
    this.registry.register(this);
  }

  async resolvePayable(
    businessId: string,
    payableId: string,
  ): Promise<PayableSnapshot> {
    const attempt = await this.prisma.formPaymentAttempt.findFirst({
      where: { id: payableId, businessId },
      include: { form: { select: { name: true } } },
    });
    if (!attempt) {
      return {
        amountDue: '0',
        contactId: '',
        description: 'Form payment',
        currency: 'USD',
      };
    }

    return {
      amountDue: (attempt.amountCents / 100).toFixed(2),
      contactId: '',
      description: `Form payment — ${attempt.form.name}`,
      currency: attempt.currency,
    };
  }

  async onPaymentComplete(_ctx: PaymentCompleteContext): Promise<void> {
    // Form payment fulfillment is owned by FormPaymentService after submit/webhook.
  }
}
