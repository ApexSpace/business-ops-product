import {
  IntegrationResourceStatus,
  IntegrationStatus,
} from '@prisma/client';
import type { StripeConnectAccount } from '../stripe.types';

export interface StripeAccountStatusSnapshot {
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  defaultCurrency: string | null;
  country: string | null;
  livemode: boolean;
  readinessLabel: string;
  resourceStatus: IntegrationResourceStatus;
  integrationStatus: IntegrationStatus;
}

export function mapStripeAccountStatus(
  account: StripeConnectAccount,
  livemodeFromOAuth?: boolean,
): StripeAccountStatusSnapshot {
  const chargesEnabled = account.charges_enabled ?? false;
  const payoutsEnabled = account.payouts_enabled ?? false;
  const detailsSubmitted = account.details_submitted ?? false;
  const livemode = livemodeFromOAuth ?? false;

  let readinessLabel = 'Ready to accept payments';
  let resourceStatus: IntegrationResourceStatus =
    IntegrationResourceStatus.ACTIVE;
  const integrationStatus = IntegrationStatus.CONNECTED;

  if (!detailsSubmitted) {
    readinessLabel = 'Setup incomplete';
    resourceStatus = IntegrationResourceStatus.INACTIVE;
  } else if (!chargesEnabled) {
    readinessLabel = 'Payments not enabled yet';
    resourceStatus = IntegrationResourceStatus.INACTIVE;
  } else if (!payoutsEnabled) {
    readinessLabel = 'Payouts not enabled yet';
    resourceStatus = IntegrationResourceStatus.INACTIVE;
  }

  return {
    chargesEnabled,
    payoutsEnabled,
    detailsSubmitted,
    defaultCurrency: account.default_currency ?? null,
    country: account.country ?? null,
    livemode,
    readinessLabel,
    resourceStatus,
    integrationStatus,
  };
}

export function maskStripeAccountId(accountId: string): string {
  if (accountId.length <= 8) return accountId;
  return `${accountId.slice(0, 7)}…${accountId.slice(-4)}`;
}
