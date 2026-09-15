import { HttpStatus } from '@nestjs/common';
import { IntegrationStatus } from '@prisma/client';
import { AppException } from '@app/common/exceptions/app.exception';
import { StripeAccountLinksService } from './stripe-account-links.service';

describe('StripeAccountLinksService', () => {
  const businessId = 'biz-1';
  const actor = { id: 'user-1', businessId } as never;

  let service: StripeAccountLinksService;
  let stripeApiService: {
    isConfigured: jest.Mock;
    createAccountOnboardingLink: jest.Mock;
    createAccountLoginLink: jest.Mock;
  };
  let businessIntegrationRepository: { findByBusinessAndKey: jest.Mock };
  let stripeConnectContext: { getPublishableKey: jest.Mock };
  let auditService: { log: jest.Mock };
  let configService: { get: jest.Mock };

  beforeEach(() => {
    stripeApiService = {
      isConfigured: jest.fn().mockReturnValue(true),
      createAccountOnboardingLink: jest
        .fn()
        .mockResolvedValue('https://stripe.test/onboarding'),
      createAccountLoginLink: jest
        .fn()
        .mockResolvedValue('https://stripe.test/dashboard'),
    };
    businessIntegrationRepository = {
      findByBusinessAndKey: jest.fn(),
    };
    stripeConnectContext = {
      getPublishableKey: jest.fn().mockReturnValue('pk_test'),
    };
    auditService = { log: jest.fn().mockResolvedValue(undefined) };
    configService = {
      get: jest.fn().mockReturnValue('http://localhost:3001'),
    };

    service = new StripeAccountLinksService(
      configService as never,
      stripeApiService as never,
      businessIntegrationRepository as never,
      stripeConnectContext as never,
      auditService as never,
    );
  });

  it('returns NOT_CONNECTED when no integration exists', async () => {
    businessIntegrationRepository.findByBusinessAndKey.mockResolvedValue(null);
    const summary = await service.getPrimaryAccountSummary(businessId);
    expect(summary.connectionStatus).toBe('NOT_CONNECTED');
    expect(summary.ready).toBe(false);
  });

  it('returns CONNECTED_INCOMPLETE when setup is unfinished', async () => {
    businessIntegrationRepository.findByBusinessAndKey.mockResolvedValue({
      status: IntegrationStatus.CONNECTED,
      connectedAccountName: 'Test Spa',
      config: {
        stripeAccountId: 'acct_123',
        livemode: false,
        chargesEnabled: false,
        payoutsEnabled: false,
        detailsSubmitted: false,
        readinessLabel: 'Setup incomplete',
        defaultCurrency: 'usd',
        country: 'US',
      },
    });

    const summary = await service.getPrimaryAccountSummary(businessId);
    expect(summary.connectionStatus).toBe('CONNECTED_INCOMPLETE');
    expect(summary.readinessLabel).toBe('Setup incomplete');
  });

  it('creates onboarding link for incomplete account', async () => {
    businessIntegrationRepository.findByBusinessAndKey.mockResolvedValue({
      status: IntegrationStatus.CONNECTED,
      config: {
        stripeAccountId: 'acct_123',
        livemode: false,
        chargesEnabled: false,
        payoutsEnabled: false,
        detailsSubmitted: false,
        readinessLabel: 'Setup incomplete',
      },
    });

    const result = await service.createOnboardingLink(businessId, actor);
    expect(result.url).toContain('stripe.test');
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'stripe.account_link.created' }),
    );
  });

  it('creates dashboard link for ready account', async () => {
    businessIntegrationRepository.findByBusinessAndKey.mockResolvedValue({
      status: IntegrationStatus.CONNECTED,
      config: {
        stripeAccountId: 'acct_123',
        livemode: true,
        chargesEnabled: true,
        payoutsEnabled: true,
        detailsSubmitted: true,
        readinessLabel: 'Ready to accept payments',
        defaultCurrency: 'usd',
        country: 'US',
      },
    });

    const result = await service.createDashboardLink(businessId, actor);
    expect(result.url).toContain('stripe.test');
  });

  it('rejects dashboard link when account is incomplete', async () => {
    businessIntegrationRepository.findByBusinessAndKey.mockResolvedValue({
      status: IntegrationStatus.CONNECTED,
      config: {
        stripeAccountId: 'acct_123',
        livemode: false,
        chargesEnabled: false,
        payoutsEnabled: false,
        detailsSubmitted: false,
        readinessLabel: 'Setup incomplete',
      },
    });

    await expect(
      service.createDashboardLink(businessId, actor),
    ).rejects.toBeInstanceOf(AppException);
  });
});
