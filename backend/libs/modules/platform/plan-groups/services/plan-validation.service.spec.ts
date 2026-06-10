import { AppException } from '@app/common/exceptions/app.exception';
import {
  CapabilityStatus,
  PlanGroupStatus,
  PlanTierStatus,
} from '@prisma/client';
import { PlanValidationService } from './plan-validation.service';

describe('PlanValidationService', () => {
  const service = new PlanValidationService();

  it('rejects publish when no tiers', () => {
    expect(() =>
      service.validateGroupPublishable({ status: PlanGroupStatus.DRAFT }, []),
    ).toThrow(AppException);
  });

  it('rejects publish when tier lacks pricing or CTA', () => {
    expect(() =>
      service.validateGroupPublishable({ status: PlanGroupStatus.DRAFT }, [
        {
          name: 'Starter',
          status: PlanTierStatus.DRAFT,
          priceMonthly: null,
          priceYearly: null,
          ctaUrl: null,
        },
      ]),
    ).toThrow(AppException);
  });

  it('accepts publish when a tier has pricing', () => {
    expect(() =>
      service.validateGroupPublishable({ status: PlanGroupStatus.DRAFT }, [
        {
          name: 'Starter',
          status: PlanTierStatus.DRAFT,
          priceMonthly: { toString: () => '29' } as never,
          priceYearly: null,
          ctaUrl: null,
        },
      ]),
    ).not.toThrow();
  });

  it('rejects embed when group is draft', () => {
    expect(() =>
      service.assertEmbedAccessible({
        status: PlanGroupStatus.DRAFT,
      }),
    ).toThrow(AppException);
  });

  it('allows embed when group is published', () => {
    expect(() =>
      service.assertEmbedAccessible({
        status: PlanGroupStatus.PUBLISHED,
      }),
    ).not.toThrow();
  });

  it('rejects non-ACTIVE capability assignment', () => {
    expect(() =>
      service.validateCapabilityAssignable({
        id: 'cap-1',
        status: CapabilityStatus.DRAFT,
        deletedAt: null,
      }),
    ).toThrow(AppException);
  });

  it('blocks status in PATCH body', () => {
    expect(() => service.blockStatusInPatch(PlanGroupStatus.PUBLISHED)).toThrow(
      AppException,
    );
  });

  it('rejects tier features without labels', () => {
    expect(() => service.validateTierFeatures([{ label: '  ' }])).toThrow(
      AppException,
    );
  });

  it('rejects duplicate capability ids', () => {
    expect(() =>
      service.assertNoDuplicateCapabilities(['cap-1', 'cap-1']),
    ).toThrow(AppException);
  });

  it('detects tiers with no features or capabilities', () => {
    expect(service.tierHasNoFeaturesOrCapabilities(0, 0)).toBe(true);
    expect(service.tierHasNoFeaturesOrCapabilities(1, 0)).toBe(false);
    expect(service.tierHasNoFeaturesOrCapabilities(0, 2)).toBe(false);
  });

  it('sanitizes invalid design setting colors', () => {
    expect(
      service.sanitizeGroupDesignSettings({
        accentColor: 'red',
        sectionBackgroundColor: '#ffffff',
      }),
    ).toEqual({ sectionBackgroundColor: '#ffffff' });
  });

  it('sanitizes tier design settings', () => {
    expect(
      service.sanitizeTierDesignSettings({
        cardBackgroundColor: '#111827',
        featureIconColor: 'invalid',
      }),
    ).toEqual({ cardBackgroundColor: '#111827' });
  });
});
