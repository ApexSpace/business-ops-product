import { Injectable, Scope } from '@nestjs/common';
import { getFeatureKeysForModule } from '@app/modules/platform/capabilities/registries/capability-module.registry';
import { BusinessEffectiveCapabilitiesService } from './business-effective-capabilities.service';

@Injectable({ scope: Scope.REQUEST })
export class BusinessCapabilityCheckService {
  private capabilityKeysCache = new Map<string, Set<string>>();

  constructor(
    private readonly effectiveCapabilitiesService: BusinessEffectiveCapabilitiesService,
  ) {}

  async hasModule(businessId: string, moduleKey: string): Promise<boolean> {
    const keys = await this.getActiveCapabilityKeys(businessId);
    const moduleFeatures = getFeatureKeysForModule(moduleKey);
    if (moduleFeatures.length === 0) {
      return keys.has(moduleKey);
    }
    return moduleFeatures.some((key) => keys.has(key));
  }

  async hasCapability(
    businessId: string,
    capabilityKey: string,
  ): Promise<boolean> {
    const keys = await this.getActiveCapabilityKeys(businessId);
    return keys.has(capabilityKey);
  }

  private async getActiveCapabilityKeys(
    businessId: string,
  ): Promise<Set<string>> {
    const cached = this.capabilityKeysCache.get(businessId);
    if (cached) {
      return cached;
    }

    const keys =
      await this.effectiveCapabilitiesService.resolveFeatureKeys(businessId);
    this.capabilityKeysCache.set(businessId, keys);
    return keys;
  }
}
