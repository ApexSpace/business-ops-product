import { HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from '@app/core/database/prisma.service';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { StripeApiService } from './stripe-api.service';
import { StripeConnectContextService } from './stripe-connect-context.service';

@Injectable()
export class StripeCustomerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stripeApi: StripeApiService,
    private readonly connectContext: StripeConnectContextService,
  ) {}

  async getOrCreateForContact(
    businessId: string,
    contactId: string,
  ): Promise<{ stripeCustomerId: string }> {
    const existing = await this.prisma.contactStripeCustomer.findFirst({
      where: { businessId, contactId },
    });
    if (existing) {
      return { stripeCustomerId: existing.stripeCustomerId };
    }

    const contact = await this.prisma.contact.findFirst({
      where: { id: contactId, businessId, deletedAt: null },
      select: {
        id: true,
        email: true,
        displayName: true,
        firstName: true,
        lastName: true,
      },
    });
    if (!contact) {
      throw new AppException(
        ErrorCode.CONTACT_NOT_FOUND,
        'Contact not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const stripeAccountId =
      await this.connectContext.requireStripeAccountId(businessId);
    const stripe = this.stripeApi.getClient();

    const name =
      contact.displayName?.trim() ||
      [contact.firstName, contact.lastName].filter(Boolean).join(' ').trim() ||
      undefined;

    const customer = await stripe.customers.create(
      {
        email: contact.email ?? undefined,
        name,
        metadata: { businessId, contactId },
      },
      { stripeAccount: stripeAccountId },
    );

    await this.prisma.contactStripeCustomer.create({
      data: {
        businessId,
        contactId,
        stripeCustomerId: customer.id,
      },
    });

    return { stripeCustomerId: customer.id };
  }
}
