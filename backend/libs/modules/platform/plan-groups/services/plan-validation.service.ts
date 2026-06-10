import { HttpStatus, Injectable } from '@nestjs/common';
import {
  CapabilityStatus,
  PlanGroup,
  PlanGroupStatus,
  PlanTier,
  PlanTierStatus,
} from '@prisma/client';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import {
  PlanGroupDesignSettings,
  PlanTierDesignSettings,
} from '../types/plan-design-settings.types';
import {
  sanitizePlanGroupDesignSettings,
  sanitizePlanTierDesignSettings,
} from '../utils/plan-design-settings.util';

@Injectable()
export class PlanValidationService {
  assertTierSlugAvailable(taken: boolean): void {
    if (taken) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Tier slug is already in use in this plan group',
        HttpStatus.CONFLICT,
      );
    }
  }

  blockStatusInPatch(
    status: PlanGroupStatus | PlanTierStatus | undefined,
  ): void {
    if (status !== undefined) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Status changes must use dedicated lifecycle endpoints',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  validateTierPublishable(
    tier: Pick<PlanTier, 'name' | 'priceMonthly' | 'priceYearly' | 'ctaUrl'>,
  ): void {
    if (!tier.name?.trim()) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Tier must have a name to publish',
        HttpStatus.BAD_REQUEST,
      );
    }
    const hasPrice =
      tier.priceMonthly != null ||
      tier.priceYearly != null ||
      Boolean(tier.ctaUrl?.trim());
    if (!hasPrice) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Tier must have priceMonthly, priceYearly, or ctaUrl to publish',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  validateGroupPublishable(
    group: Pick<PlanGroup, 'status'>,
    tiers: Pick<
      PlanTier,
      'name' | 'priceMonthly' | 'priceYearly' | 'ctaUrl' | 'status'
    >[],
  ): void {
    if (group.status === PlanGroupStatus.ARCHIVED) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Archived plan groups cannot be published',
        HttpStatus.BAD_REQUEST,
      );
    }

    const publishableTiers = tiers.filter(
      (t) => t.status !== PlanTierStatus.ARCHIVED,
    );

    if (publishableTiers.length === 0) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'At least one tier is required to publish the plan group',
        HttpStatus.BAD_REQUEST,
      );
    }

    for (const tier of publishableTiers) {
      this.validateTierPublishable(tier);
    }
  }

  validateTierFeatures(features: { label: string }[] | undefined): void {
    if (!features?.length) return;
    for (const feature of features) {
      if (!feature.label?.trim()) {
        throw new AppException(
          ErrorCode.BAD_REQUEST,
          'Feature label is required',
          HttpStatus.BAD_REQUEST,
        );
      }
    }
  }

  assertNoDuplicateCapabilities(capabilityIds: string[]): void {
    if (new Set(capabilityIds).size !== capabilityIds.length) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Duplicate capabilities are not allowed',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  tierHasNoFeaturesOrCapabilities(
    featuresCount: number,
    capabilitiesCount: number,
  ): boolean {
    return featuresCount === 0 && capabilitiesCount === 0;
  }

  validateCapabilityAssignable(
    capability: {
      id: string;
      status: CapabilityStatus;
      deletedAt: Date | null;
    } | null,
  ): void {
    if (!capability) {
      throw new AppException(
        ErrorCode.NOT_FOUND,
        'Capability not found',
        HttpStatus.NOT_FOUND,
      );
    }
    if (capability.status !== CapabilityStatus.ACTIVE) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Only ACTIVE capabilities can be assigned to tiers',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  assertPublicAccessible(group: Pick<PlanGroup, 'status'>): void {
    if (group.status !== PlanGroupStatus.PUBLISHED) {
      throw new AppException(
        ErrorCode.NOT_FOUND,
        'Pricing not found',
        HttpStatus.NOT_FOUND,
      );
    }
  }

  assertEmbedAccessible(group: Pick<PlanGroup, 'status'>): void {
    this.assertPublicAccessible(group);
  }

  sanitizeGroupDesignSettings(
    settings: PlanGroupDesignSettings | undefined,
  ): PlanGroupDesignSettings | undefined {
    if (settings === undefined) return undefined;
    return sanitizePlanGroupDesignSettings(settings);
  }

  sanitizeTierDesignSettings(
    settings: PlanTierDesignSettings | undefined,
  ): PlanTierDesignSettings | undefined {
    if (settings === undefined) return undefined;
    return sanitizePlanTierDesignSettings(settings);
  }

  sanitizeCustomCss(css: string | null | undefined): string | null {
    if (!css?.trim()) return null;
    const lowered = css.toLowerCase();
    if (
      lowered.includes('<script') ||
      lowered.includes('@import') ||
      lowered.includes('url(')
    ) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'customCss contains disallowed content',
        HttpStatus.BAD_REQUEST,
      );
    }
    return css;
  }
}
