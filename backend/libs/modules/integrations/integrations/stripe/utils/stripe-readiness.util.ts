import { HttpStatus } from '@nestjs/common';
import { IntegrationStatus } from '@prisma/client';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import type { StripeIntegrationConfig } from '../services/stripe-account.service';

export type StripeIntegrationRow = {
  status: IntegrationStatus;
  config: unknown;
};

export function parseStripeIntegrationConfig(
  config: unknown,
): StripeIntegrationConfig | null {
  if (!config || typeof config !== 'object') return null;
  const c = config as Record<string, unknown>;
  const stripeAccountId =
    typeof c.stripeAccountId === 'string' ? c.stripeAccountId : null;
  if (!stripeAccountId) return null;
  return {
    stripeAccountId,
    livemode: c.livemode === true,
    scope: typeof c.scope === 'string' ? c.scope : null,
    chargesEnabled: c.chargesEnabled === true,
    payoutsEnabled: c.payoutsEnabled === true,
    detailsSubmitted: c.detailsSubmitted === true,
    defaultCurrency:
      typeof c.defaultCurrency === 'string' ? c.defaultCurrency : null,
    country: typeof c.country === 'string' ? c.country : null,
    readinessLabel:
      typeof c.readinessLabel === 'string'
        ? c.readinessLabel
        : 'Setup incomplete',
    webhookStatus:
      typeof c.webhookStatus === 'string' ? c.webhookStatus : undefined,
  };
}

export function assertStripeReadyForPayments(
  integration: StripeIntegrationRow | null,
): StripeIntegrationConfig {
  if (!integration || integration.status !== IntegrationStatus.CONNECTED) {
    throw new AppException(
      ErrorCode.BAD_REQUEST,
      'Connect Stripe before accepting online invoice payments.',
      HttpStatus.BAD_REQUEST,
    );
  }

  const config = parseStripeIntegrationConfig(integration.config);
  if (!config) {
    throw new AppException(
      ErrorCode.BAD_REQUEST,
      'Stripe account is not linked. Sync or reconnect Stripe.',
      HttpStatus.BAD_REQUEST,
    );
  }

  if (
    !config.detailsSubmitted ||
    !config.chargesEnabled ||
    !config.payoutsEnabled
  ) {
    throw new AppException(
      ErrorCode.BAD_REQUEST,
      'Stripe account setup is incomplete. Complete onboarding in Stripe before accepting payments.',
      HttpStatus.BAD_REQUEST,
    );
  }

  return config;
}
