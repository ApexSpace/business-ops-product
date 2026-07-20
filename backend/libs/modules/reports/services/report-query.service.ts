import { HttpStatus, Injectable } from '@nestjs/common';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { PrismaService } from '@app/core/database/prisma.service';
import { normalizeTimezone } from '@app/common/utils/timezone.util';
import { getFeatureKeysForModule } from '@app/modules/platform/capabilities/registries/capability-module.registry';
import { BusinessEffectiveCapabilitiesService } from '@app/modules/platform/business/services/business-effective-capabilities.service';
import type {
  ReportDefinition,
  ReportDocument,
  ReportFilters,
} from '../contracts/report-document';
import type {
  ReportDataProvider,
  ReportGenerateContext,
} from '../contracts/report-provider.interface';
import {
  getReportDefinition,
  REPORT_CATEGORY_LABELS,
  REPORT_DEFINITIONS,
} from '../registry/report.definitions';
import { resolveReportDateRange } from '../utils/report-date-range.util';

export type ReportCatalogItemDto = {
  key: string;
  category: string;
  categoryLabel: string;
  title: string;
  description: string;
  filters: ReportDefinition['filters'];
  footnotes: string[];
  exportFormats: Array<'pdf' | 'xlsx'>;
};

@Injectable()
export class ReportQueryService {
  private readonly providers = new Map<string, ReportDataProvider>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly effectiveCapabilities: BusinessEffectiveCapabilitiesService,
  ) {}

  registerProvider(provider: ReportDataProvider): void {
    this.providers.set(provider.key, provider);
  }

  async listCatalog(businessId: string): Promise<ReportCatalogItemDto[]> {
    const needsBrandOptions = REPORT_DEFINITIONS.some(
      (def) =>
        !def.deferred &&
        this.providers.has(def.key) &&
        def.filters.some((field) => field.key === 'brand'),
    );
    const brandOptions = needsBrandOptions
      ? await this.loadBrandFilterOptions(businessId)
      : null;

    const items: ReportCatalogItemDto[] = [];
    for (const def of REPORT_DEFINITIONS) {
      if (def.deferred) continue;
      if (!this.providers.has(def.key)) continue;
      const allowed = await this.isReportAllowed(businessId, def);
      if (!allowed) continue;
      items.push({
        key: def.key,
        category: def.category,
        categoryLabel: REPORT_CATEGORY_LABELS[def.category],
        title: def.title,
        description: def.description,
        filters: this.withDynamicFilterOptions(def.filters, brandOptions),
        footnotes: def.footnotes ?? [],
        exportFormats: def.exportFormats ?? ['pdf', 'xlsx'],
      });
    }
    return items;
  }

  private withDynamicFilterOptions(
    filters: ReportDefinition['filters'],
    brandOptions: Array<{ value: string; label: string }> | null,
  ): ReportDefinition['filters'] {
    if (!brandOptions) return filters;
    return filters.map((field) => {
      if (field.key !== 'brand') return field;
      return { ...field, options: brandOptions };
    });
  }

  private async loadBrandFilterOptions(
    businessId: string,
  ): Promise<Array<{ value: string; label: string }>> {
    const rows = await this.prisma.product.findMany({
      where: {
        businessId,
        deletedAt: null,
        AND: [{ brand: { not: null } }, { brand: { not: '' } }],
      },
      select: { brand: true },
      distinct: ['brand'],
      orderBy: { brand: 'asc' },
    });

    const brands = rows
      .map((row) => row.brand?.trim())
      .filter((brand): brand is string => Boolean(brand))
      .sort((a, b) => a.localeCompare(b));

    return [
      { value: 'all', label: 'All' },
      ...brands.map((brand) => ({ value: brand, label: brand })),
    ];
  }

  async generate(
    businessId: string,
    reportKey: string,
    filters: ReportFilters,
  ): Promise<ReportDocument> {
    const def = this.requireDefinition(reportKey);
    await this.assertReportAllowed(businessId, def);

    const provider = this.providers.get(reportKey);
    if (!provider) {
      throw new AppException(
        ErrorCode.NOT_FOUND,
        `Report provider not registered: ${reportKey}`,
        HttpStatus.NOT_FOUND,
      );
    }

    const context = await this.buildContext(businessId);
    return provider.generate(businessId, filters ?? {}, context);
  }

  async assertReportAllowed(
    businessId: string,
    def: ReportDefinition,
  ): Promise<void> {
    if (def.deferred) {
      throw new AppException(
        ErrorCode.FEATURE_NOT_AVAILABLE,
        def.deferredReason ?? 'This report is not available yet.',
        HttpStatus.FORBIDDEN,
      );
    }
    const allowed = await this.isReportAllowed(businessId, def);
    if (!allowed) {
      throw new AppException(
        ErrorCode.FEATURE_NOT_AVAILABLE,
        'This feature is not included in your current package.',
        HttpStatus.FORBIDDEN,
      );
    }
  }

  async isReportAllowed(
    businessId: string,
    def: ReportDefinition,
  ): Promise<boolean> {
    const keys =
      await this.effectiveCapabilities.resolveFeatureKeys(businessId);

    if (def.requiredCapabilityKey) {
      return keys.has(def.requiredCapabilityKey);
    }
    if (def.requiredModuleKey) {
      const moduleFeatures = getFeatureKeysForModule(def.requiredModuleKey);
      if (moduleFeatures.length === 0) {
        return keys.has(def.requiredModuleKey);
      }
      return moduleFeatures.some((key) => keys.has(key));
    }
    return true;
  }

  requireDefinition(reportKey: string): ReportDefinition {
    const def = getReportDefinition(reportKey);
    if (!def) {
      throw new AppException(
        ErrorCode.NOT_FOUND,
        `Unknown report: ${reportKey}`,
        HttpStatus.NOT_FOUND,
      );
    }
    return def;
  }

  shouldQueue(
    def: ReportDefinition,
    filters: ReportFilters,
    timezone: string,
  ): boolean {
    const range = resolveReportDateRange(filters, timezone);
    const maxDays = def.syncMaxDateSpanDays ?? 31;
    return range.spanDays > maxDays;
  }

  async getBusinessTimezone(businessId: string): Promise<string> {
    const business = await this.prisma.business.findFirst({
      where: { id: businessId, deletedAt: null },
      select: { timezone: true },
    });
    return normalizeTimezone(business?.timezone);
  }

  private async buildContext(
    businessId: string,
  ): Promise<ReportGenerateContext> {
    const business = await this.prisma.business.findFirst({
      where: { id: businessId, deletedAt: null },
      select: { name: true, timezone: true, settings: true },
    });
    if (!business) {
      throw new AppException(
        ErrorCode.NOT_FOUND,
        'Business not found',
        HttpStatus.NOT_FOUND,
      );
    }
    const settings =
      business.settings &&
      typeof business.settings === 'object' &&
      !Array.isArray(business.settings)
        ? (business.settings as Record<string, unknown>)
        : {};
    const currency =
      typeof settings.currency === 'string' && settings.currency
        ? settings.currency
        : 'USD';
    return {
      businessName: business.name,
      currency,
      timezone: normalizeTimezone(business.timezone),
      generatedAt: new Date(),
    };
  }
}
