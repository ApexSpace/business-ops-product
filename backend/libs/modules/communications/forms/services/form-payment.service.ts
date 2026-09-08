import { HttpStatus, Injectable } from '@nestjs/common';
import {
  BusinessType,
  FormPaymentAttemptStatus,
  FormPaymentRail,
  FormStatus,
  InvoiceKind,
  InvoiceLineType,
  InvoicePaymentStatus,
  InvoiceStatus,
  PayableType,
  PaymentMethod,
  PaymentProvider,
  PaymentStatus,
  Prisma,
} from '@prisma/client';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { PrismaService } from '@app/core/database/prisma.service';
import { STRIPE_PAYMENT_PURPOSE } from '@app/modules/finance/payments/constants/stripe-payment-purpose.constants';
import { generateInvoicePublicToken } from '@app/modules/finance/invoices/utils/invoice-public-token.util';
import { FinancialSettingsService } from '@app/modules/platform/business/services/financial-settings.service';
import { BusinessIntegrationRepository } from '@app/modules/integrations/integrations/repositories/business-integration.repository';
import { StripeApiService } from '@app/modules/integrations/integrations/stripe/services/stripe-api.service';
import { StripePlatformApiService } from '@app/modules/platform/billing/stripe/services/stripe-platform-api.service';
import { StripeConnectContextService } from '@app/modules/integrations/integrations/stripe/services/stripe-connect-context.service';
import { assertStripeReadyForPayments } from '@app/modules/integrations/integrations/stripe/utils/stripe-readiness.util';
import { isStripeModeConfigured } from '@app/modules/integrations/integrations/stripe/utils/stripe-mode.util';
import { randomUUID } from 'crypto';
import {
  amountToCents,
  extractPayerFromFormData,
  getSingleCollectPaymentField,
} from '../utils/form-collect-payment.util';
import {
  parseFormDefinition,
  sanitizeFormDefinition,
} from '../utils/form-definition.util';
import { FormsRepository } from '../repositories/forms.repository';

export type FormPaymentIntentResult = {
  attemptId: string;
  paymentIntentId: string;
  clientSecret: string;
  publishableKey: string;
  stripeAccountId: string | null;
  amountCents: number;
  currency: string;
  livemode: boolean;
  rail: FormPaymentRail;
};

@Injectable()
export class FormPaymentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly formsRepository: FormsRepository,
    private readonly stripeApi: StripeApiService,
    private readonly stripePlatformApi: StripePlatformApiService,
    private readonly stripeConnectContext: StripeConnectContextService,
    private readonly businessIntegrationRepository: BusinessIntegrationRepository,
    private readonly financialSettingsService: FinancialSettingsService,
  ) {}

  async createPaymentIntent(
    publicKey: string,
  ): Promise<FormPaymentIntentResult> {
    const form = await this.requirePublishedForm(publicKey);
    const definition = sanitizeFormDefinition(parseFormDefinition(form));
    const paymentField = getSingleCollectPaymentField(definition);
    if (!paymentField) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'This form does not collect payment',
        HttpStatus.BAD_REQUEST,
      );
    }

    const business = await this.prisma.business.findFirst({
      where: { id: form.businessId, deletedAt: null },
      select: { id: true, type: true, settings: true, name: true },
    });
    if (!business) {
      throw new AppException(
        ErrorCode.NOT_FOUND,
        'Business not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const paymentsMode =
      await this.stripeConnectContext.getPaymentsModeForBusiness(
        form.businessId,
      );
    if (!isStripeModeConfigured(paymentsMode)) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        paymentsMode === 'test'
          ? 'Stripe test mode is not configured'
          : 'Stripe is not configured',
        HttpStatus.BAD_REQUEST,
      );
    }

    const amountCents = amountToCents(paymentField.amount);
    const currency = paymentField.currency.toLowerCase();
    const livemode = paymentsMode === 'live';
    const isPlatform = business.type === BusinessType.INTERNAL;
    const rail = isPlatform
      ? FormPaymentRail.PLATFORM
      : FormPaymentRail.CONNECT;

    let stripeAccountId: string | null = null;
    let stripe;
    let publishableKey: string | null;

    if (isPlatform) {
      stripe = this.stripePlatformApi.getClientForMode(paymentsMode);
      publishableKey =
        this.stripePlatformApi.getPublishableKeyForMode(paymentsMode);
    } else {
      const integration =
        await this.businessIntegrationRepository.findByBusinessAndKey(
          form.businessId,
          'stripe',
        );
      const config = assertStripeReadyForPayments(integration);
      stripeAccountId = config.stripeAccountId;
      stripe = this.stripeApi.getClientForMode(paymentsMode);
      publishableKey = this.stripeApi.getPublishableKeyForMode(paymentsMode);
    }

    if (!publishableKey) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Stripe publishable key is not configured for the selected mode',
        HttpStatus.BAD_REQUEST,
      );
    }

    const attemptId = randomUUID();

    const intent = await stripe.paymentIntents.create(
      {
        amount: amountCents,
        currency,
        payment_method_types: ['card'],
        metadata: {
          purpose: STRIPE_PAYMENT_PURPOSE.FORM,
          businessId: form.businessId,
          formId: form.id,
          publicKey: form.publicKey,
          attemptId,
          payableType: PayableType.FORM_PAYMENT,
          payableId: attemptId,
          amountCents: String(amountCents),
          currency: currency.toUpperCase(),
          rail,
        },
        description: `Form payment — ${form.name}`,
      },
      stripeAccountId ? { stripeAccount: stripeAccountId } : undefined,
    );

    if (!intent.client_secret) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Unable to create payment',
        HttpStatus.BAD_REQUEST,
      );
    }

    await this.prisma.formPaymentAttempt.create({
      data: {
        id: attemptId,
        businessId: form.businessId,
        formId: form.id,
        publicKey: form.publicKey,
        amountCents,
        currency: currency.toUpperCase(),
        livemode,
        rail,
        status: FormPaymentAttemptStatus.CREATED,
        stripePaymentIntentId: intent.id,
      },
    });

    return {
      attemptId,
      paymentIntentId: intent.id,
      clientSecret: intent.client_secret,
      publishableKey,
      stripeAccountId,
      amountCents,
      currency: currency.toUpperCase(),
      livemode,
      rail,
    };
  }

  async verifyPaymentForSubmission(params: {
    publicKey: string;
    paymentIntentId: string;
    data: Record<string, unknown>;
  }) {
    const form = await this.requirePublishedForm(params.publicKey);
    const definition = sanitizeFormDefinition(parseFormDefinition(form));
    const paymentField = getSingleCollectPaymentField(definition);
    if (!paymentField) {
      return null;
    }

    if (!params.paymentIntentId?.trim()) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Payment is required for this form',
        HttpStatus.BAD_REQUEST,
      );
    }

    const attempt = await this.prisma.formPaymentAttempt.findFirst({
      where: {
        stripePaymentIntentId: params.paymentIntentId.trim(),
        formId: form.id,
        businessId: form.businessId,
      },
    });
    if (!attempt) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Payment was not found for this form',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (attempt.formSubmissionId) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'This payment was already used for a submission',
        HttpStatus.BAD_REQUEST,
      );
    }

    const expectedCents = amountToCents(paymentField.amount);
    if (attempt.amountCents !== expectedCents) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Payment amount does not match the form',
        HttpStatus.BAD_REQUEST,
      );
    }

    const paymentsMode =
      await this.stripeConnectContext.getPaymentsModeForBusiness(
        form.businessId,
      );
    const stripe =
      attempt.rail === FormPaymentRail.PLATFORM
        ? this.stripePlatformApi.getClientForMode(paymentsMode)
        : this.stripeApi.getClientForMode(paymentsMode);

    let stripeAccountId: string | undefined;
    if (attempt.rail === FormPaymentRail.CONNECT) {
      const integration =
        await this.businessIntegrationRepository.findByBusinessAndKey(
          form.businessId,
          'stripe',
        );
      stripeAccountId = assertStripeReadyForPayments(integration).stripeAccountId;
    }

    const intent = await stripe.paymentIntents.retrieve(
      attempt.stripePaymentIntentId,
      undefined,
      stripeAccountId ? { stripeAccount: stripeAccountId } : undefined,
    );

    if (intent.status !== 'succeeded' && intent.status !== 'processing') {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Payment has not been completed',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (intent.metadata?.purpose !== STRIPE_PAYMENT_PURPOSE.FORM) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Invalid payment for this form',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (intent.amount !== expectedCents) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Payment amount does not match the form',
        HttpStatus.BAD_REQUEST,
      );
    }

    const payer = extractPayerFromFormData(definition.fields, params.data);
    const chargeId =
      typeof intent.latest_charge === 'string'
        ? intent.latest_charge
        : intent.latest_charge &&
            typeof intent.latest_charge === 'object' &&
            'id' in intent.latest_charge
          ? String((intent.latest_charge as { id: string }).id)
          : null;

    return {
      attempt,
      payer,
      chargeId,
      definition,
    };
  }

  async attachSubmissionToAttempt(params: {
    attemptId: string;
    submissionId: string;
    payer?: { email?: string; phone?: string; name?: string };
    chargeId?: string | null;
    data?: Record<string, unknown>;
  }) {
    const attempt = await this.prisma.formPaymentAttempt.update({
      where: { id: params.attemptId },
      data: {
        formSubmissionId: params.submissionId,
        status: FormPaymentAttemptStatus.SUCCEEDED,
        ...(params.chargeId ? { stripeChargeId: params.chargeId } : {}),
        ...(params.payer?.email ? { payerEmail: params.payer.email } : {}),
        ...(params.payer?.phone ? { payerPhone: params.payer.phone } : {}),
        ...(params.payer?.name ? { payerName: params.payer.name } : {}),
        ...(params.data
          ? { formDataSnapshot: params.data as Prisma.InputJsonValue }
          : {}),
      },
    });

    if (attempt.rail === FormPaymentRail.CONNECT) {
      await this.fulfillTenantPayment(attempt.id);
    }

    return attempt;
  }

  async markSucceededPendingSubmission(params: {
    paymentIntentId: string;
    chargeId?: string | null;
  }) {
    const attempt = await this.prisma.formPaymentAttempt.findUnique({
      where: { stripePaymentIntentId: params.paymentIntentId },
    });
    if (!attempt) return false;
    if (attempt.formSubmissionId) return true;
    if (
      attempt.status === FormPaymentAttemptStatus.SUCCEEDED ||
      attempt.status === FormPaymentAttemptStatus.SUCCEEDED_PENDING_SUBMISSION
    ) {
      return true;
    }

    await this.prisma.formPaymentAttempt.update({
      where: { id: attempt.id },
      data: {
        status: FormPaymentAttemptStatus.SUCCEEDED_PENDING_SUBMISSION,
        ...(params.chargeId ? { stripeChargeId: params.chargeId } : {}),
      },
    });
    return true;
  }

  async markFailed(paymentIntentId: string) {
    const attempt = await this.prisma.formPaymentAttempt.findUnique({
      where: { stripePaymentIntentId: paymentIntentId },
    });
    if (!attempt || attempt.formSubmissionId) return;
    await this.prisma.formPaymentAttempt.update({
      where: { id: attempt.id },
      data: { status: FormPaymentAttemptStatus.FAILED },
    });
  }

  private async fulfillTenantPayment(attemptId: string) {
    const attempt = await this.prisma.formPaymentAttempt.findUnique({
      where: { id: attemptId },
    });
    if (!attempt || attempt.paymentId || attempt.rail !== FormPaymentRail.CONNECT) {
      return;
    }

    const existingPayment = await this.prisma.payment.findFirst({
      where: {
        stripePaymentIntentId: attempt.stripePaymentIntentId,
        deletedAt: null,
      },
    });
    if (existingPayment) {
      await this.prisma.formPaymentAttempt.update({
        where: { id: attempt.id },
        data: { paymentId: existingPayment.id },
      });
      return;
    }

    const contactId = await this.ensureContact(attempt);
    if (!contactId) return;

    const amount = new Prisma.Decimal((attempt.amountCents / 100).toFixed(2));
    const now = new Date();
    const invoiceNumber =
      await this.financialSettingsService.allocateInvoiceNumber(
        attempt.businessId,
      );

    const form = await this.prisma.form.findFirst({
      where: { id: attempt.formId },
      select: { name: true },
    });

    const result = await this.prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.create({
        data: {
          business: { connect: { id: attempt.businessId } },
          contact: { connect: { id: contactId } },
          kind: InvoiceKind.STANDARD,
          invoiceNumber,
          publicToken: generateInvoicePublicToken(),
          status: InvoiceStatus.PAID,
          paymentStatus: InvoicePaymentStatus.PAID,
          issueDate: now,
          subtotal: amount,
          taxAmount: new Prisma.Decimal(0),
          discountAmount: new Prisma.Decimal(0),
          totalAmount: amount,
          balanceDue: new Prisma.Decimal(0),
          remainingAmount: new Prisma.Decimal(0),
          paidAmount: amount,
          lastPaymentAt: now,
          notes: `Form payment — ${form?.name ?? 'Form'}`,
          items: {
            create: [
              {
                lineType: InvoiceLineType.CUSTOM,
                title: form?.name
                  ? `Form payment — ${form.name}`
                  : 'Form payment',
                quantity: new Prisma.Decimal(1),
                unitPrice: amount,
                totalPrice: amount,
                sortOrder: 0,
              },
            ],
          },
        },
      });

      const payment = await tx.payment.create({
        data: {
          business: { connect: { id: attempt.businessId } },
          invoice: { connect: { id: invoice.id } },
          contact: { connect: { id: contactId } },
          payableType: PayableType.FORM_PAYMENT,
          payableId: attempt.id,
          amount,
          method: PaymentMethod.STRIPE,
          status: PaymentStatus.SUCCEEDED,
          provider: PaymentProvider.STRIPE,
          reference: attempt.stripePaymentIntentId,
          stripePaymentIntentId: attempt.stripePaymentIntentId,
          ...(attempt.stripeChargeId
            ? { stripeChargeId: attempt.stripeChargeId }
            : {}),
          paidAt: now,
          providerMetadata: {
            currency: attempt.currency,
            source: 'form',
            formId: attempt.formId,
            attemptId: attempt.id,
          },
        },
      });

      await tx.formPaymentAttempt.update({
        where: { id: attempt.id },
        data: { paymentId: payment.id },
      });

      return payment;
    });

    return result;
  }

  private async ensureContact(attempt: {
    businessId: string;
    payerEmail: string | null;
    payerPhone: string | null;
    payerName: string | null;
  }): Promise<string | null> {
    const email = attempt.payerEmail?.trim().toLowerCase() || null;
    const phone = attempt.payerPhone?.trim() || null;
    if (!email && !phone) {
      // Create a placeholder contact so Payments tab still works.
      const created = await this.prisma.contact.create({
        data: {
          business: { connect: { id: attempt.businessId } },
          firstName: attempt.payerName?.split(/\s+/)[0] || 'Form',
          lastName:
            attempt.payerName?.split(/\s+/).slice(1).join(' ') || 'Payer',
          source: 'form_payment',
        },
      });
      return created.id;
    }

    if (email) {
      const existing = await this.prisma.contact.findFirst({
        where: {
          businessId: attempt.businessId,
          email,
          deletedAt: null,
        },
        select: { id: true },
      });
      if (existing) return existing.id;
    }

    const nameParts = (attempt.payerName ?? '').trim().split(/\s+/);
    const created = await this.prisma.contact.create({
      data: {
        business: { connect: { id: attempt.businessId } },
        firstName: nameParts[0] || 'Form',
        lastName: nameParts.slice(1).join(' ') || 'Payer',
        ...(email ? { email } : {}),
        ...(phone ? { phoneNumber: phone } : {}),
        source: 'form_payment',
      },
    });
    return created.id;
  }

  private async requirePublishedForm(publicKey: string) {
    const form = await this.formsRepository.findByPublicKey(publicKey.trim());
    if (!form || form.status !== FormStatus.PUBLISHED) {
      throw new AppException(
        ErrorCode.FORM_NOT_FOUND,
        'Form not found',
        HttpStatus.NOT_FOUND,
      );
    }
    return form;
  }
}
