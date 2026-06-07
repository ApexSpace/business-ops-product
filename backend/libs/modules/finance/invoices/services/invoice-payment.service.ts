import { HttpStatus, Injectable } from '@nestjs/common';
import {
  InvoicePaymentStatus,
  InvoiceStatus,
  Prisma,
} from '@prisma/client';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { AuditService } from '@app/modules/platform/audit/services/audit.service';
import type { RequestUser } from '@app/common/decorators/current-user.decorator';
import { FinancialSettingsService } from '@app/modules/platform/business/services/financial-settings.service';
import { BusinessIntegrationRepository } from '@app/modules/integrations/integrations/repositories/business-integration.repository';
import { StripeCheckoutService } from '@app/modules/integrations/integrations/stripe/services/stripe-checkout.service';
import { assertStripeReadyForPayments } from '@app/modules/integrations/integrations/stripe/utils/stripe-readiness.util';
import { InvoiceRepository } from '../repositories/invoice.repository';
import {
  buildInvoicePublicUrl,
  generateInvoicePublicToken,
} from '../utils/invoice-public-token.util';
import { PublicInvoiceResponseDto } from '../dto/public-invoice-response.dto';
import { toPublicInvoiceResponse } from '../mappers/public-invoice.mapper';
import { EmailNotificationService } from '@app/modules/communications/email/services/email-notification.service';
import {
  formatContactName,
  formatMoney,
} from '@app/modules/communications/email/utils/email-variables.util';
import { BusinessRepository } from '@app/modules/platform/business/repositories/business.repository';

export type CreateInvoicePaymentLinkResult = {
  checkoutUrl: string;
  sessionId: string;
  publicUrl: string;
};

@Injectable()
export class InvoicePaymentService {
  constructor(
    private readonly invoiceRepository: InvoiceRepository,
    private readonly businessIntegrationRepository: BusinessIntegrationRepository,
    private readonly stripeCheckoutService: StripeCheckoutService,
    private readonly financialSettingsService: FinancialSettingsService,
    private readonly auditService: AuditService,
    private readonly emailNotificationService: EmailNotificationService,
    private readonly businessRepository: BusinessRepository,
  ) {}

  async createPaymentLink(
    businessId: string,
    invoiceId: string,
    actor: RequestUser,
  ): Promise<CreateInvoicePaymentLinkResult> {
    const invoice = await this.invoiceRepository.findById(businessId, invoiceId);
    if (!invoice) {
      throw new AppException(
        ErrorCode.INVOICE_NOT_FOUND,
        'Invoice not found',
        HttpStatus.NOT_FOUND,
      );
    }

    if (invoice.status === InvoiceStatus.VOID) {
      throw new AppException(
        ErrorCode.INVOICE_NOT_PAYABLE,
        'Cannot accept payments on a void invoice',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (
      invoice.paymentStatus === InvoicePaymentStatus.PAID ||
      invoice.balanceDue.lessThanOrEqualTo(0)
    ) {
      throw new AppException(
        ErrorCode.INVOICE_NOT_PAYABLE,
        'This invoice is already fully paid',
        HttpStatus.BAD_REQUEST,
      );
    }

    const integration =
      await this.businessIntegrationRepository.findByBusinessAndKey(
        businessId,
        'stripe',
      );
    assertStripeReadyForPayments(integration);

    const invoiceWithToken =
      (await this.ensurePublicToken(businessId, invoice)) ?? invoice;
    const financialSettings =
      await this.financialSettingsService.getSettingsForBusiness(businessId);
    const currency = financialSettings.taxesAndCurrency.currencyCode.toLowerCase();
    const amountCents = Math.round(
      Number(invoiceWithToken.balanceDue.toString()) * 100,
    );

    if (amountCents <= 0) {
      throw new AppException(
        ErrorCode.INVOICE_NOT_PAYABLE,
        'Nothing left to pay on this invoice',
        HttpStatus.BAD_REQUEST,
      );
    }

    const { sessionId, url } =
      await this.stripeCheckoutService.createInvoiceCheckoutSession(
        invoiceId,
        businessId,
        {
          amountCents,
          currency,
          contactId: invoice.contactId,
          description: `Invoice ${invoice.invoiceNumber}`,
          publicToken: invoiceWithToken.publicToken,
        },
      );

    const frontendUrl = process.env.FRONTEND_URL?.replace(/\/$/, '') ?? '';
    const publicUrl = invoiceWithToken.publicUrl
      ?? buildInvoicePublicUrl(frontendUrl, invoiceWithToken.publicToken);

    await this.invoiceRepository.update(businessId, invoiceId, {
      stripeCheckoutUrl: url,
      stripePaymentLinkId: sessionId,
      publicUrl,
    });

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'invoice.payment_link.created',
      entityType: 'Invoice',
      entityId: invoiceId,
      metadata: { sessionId, publicUrl },
    });

    void this.sendPaymentLinkEmail(
      businessId,
      invoiceWithToken,
      publicUrl,
      url,
      currency,
      sessionId,
    ).catch(() => undefined);

    return { checkoutUrl: url, sessionId, publicUrl };
  }

  private async sendPaymentLinkEmail(
    businessId: string,
    invoice: NonNullable<Awaited<ReturnType<InvoiceRepository['findById']>>>,
    publicUrl: string,
    paymentLink: string,
    currency: string,
    sessionId: string,
  ): Promise<void> {
    const contactEmail = invoice.contact?.email?.trim();
    if (!contactEmail) {
      return;
    }

    const business = await this.businessRepository.findById(businessId);

    await this.emailNotificationService.enqueueTransactionalEmail({
      businessId,
      emailType: 'invoice.payment_link',
      toEmail: contactEmail,
      contactId: invoice.contactId,
      entityType: 'Invoice',
      entityId: invoice.id,
      idempotencyKey: `invoice-payment-link-${invoice.id}-${sessionId}`,
      variables: {
        'business.name': business?.name ?? 'Business',
        'contact.name': formatContactName(invoice.contact),
        'invoice.number': invoice.invoiceNumber,
        'invoice.balance_due': formatMoney(invoice.balanceDue, currency.toUpperCase()),
        payment_link: paymentLink,
        'invoice.public_url': publicUrl,
      },
    });
  }

  async getPublicByToken(publicToken: string): Promise<PublicInvoiceResponseDto> {
    const invoice = await this.invoiceRepository.findByPublicToken(publicToken);
    if (!invoice) {
      throw new AppException(
        ErrorCode.INVOICE_NOT_FOUND,
        'Invoice not found',
        HttpStatus.NOT_FOUND,
      );
    }
    return toPublicInvoiceResponse(invoice);
  }

  async startPublicCheckout(publicToken: string): Promise<{ checkoutUrl: string }> {
    const invoice = await this.invoiceRepository.findByPublicToken(publicToken);
    if (!invoice) {
      throw new AppException(
        ErrorCode.INVOICE_NOT_FOUND,
        'Invoice not found',
        HttpStatus.NOT_FOUND,
      );
    }

    if (
      invoice.paymentStatus === InvoicePaymentStatus.PAID ||
      invoice.balanceDue.lessThanOrEqualTo(0) ||
      invoice.status === InvoiceStatus.VOID
    ) {
      throw new AppException(
        ErrorCode.INVOICE_NOT_PAYABLE,
        'This invoice has no balance due',
        HttpStatus.BAD_REQUEST,
      );
    }

    const integration =
      await this.businessIntegrationRepository.findByBusinessAndKey(
        invoice.businessId,
        'stripe',
      );
    assertStripeReadyForPayments(integration);

    if (
      invoice.stripeCheckoutUrl &&
      invoice.stripePaymentLinkId
    ) {
      return { checkoutUrl: invoice.stripeCheckoutUrl };
    }

    const financialSettings =
      await this.financialSettingsService.getSettingsForBusiness(
        invoice.businessId,
      );
    const currency = financialSettings.taxesAndCurrency.currencyCode.toLowerCase();
    const amountCents = Math.round(Number(invoice.balanceDue.toString()) * 100);

    const { sessionId, url } =
      await this.stripeCheckoutService.createInvoiceCheckoutSession(
        invoice.id,
        invoice.businessId,
        {
          amountCents,
          currency,
          contactId: invoice.contactId,
          description: `Invoice ${invoice.invoiceNumber}`,
          publicToken: invoice.publicToken,
        },
      );

    const frontendUrl = process.env.FRONTEND_URL?.replace(/\/$/, '') ?? '';
    const publicUrl =
      invoice.publicUrl ??
      buildInvoicePublicUrl(frontendUrl, invoice.publicToken);

    await this.invoiceRepository.update(invoice.businessId, invoice.id, {
      stripeCheckoutUrl: url,
      stripePaymentLinkId: sessionId,
      publicUrl,
    });

    return { checkoutUrl: url };
  }

  private async ensurePublicToken(
    businessId: string,
    invoice: NonNullable<Awaited<ReturnType<InvoiceRepository['findById']>>>,
  ) {
    if (invoice.publicToken) {
      return invoice;
    }

    const publicToken = generateInvoicePublicToken();
    const frontendUrl = process.env.FRONTEND_URL?.replace(/\/$/, '') ?? '';
    const publicUrl = buildInvoicePublicUrl(frontendUrl, publicToken);

    const updated = await this.invoiceRepository.update(businessId, invoice.id, {
      publicToken,
      publicUrl,
    });

    return updated ?? invoice;
  }
}
