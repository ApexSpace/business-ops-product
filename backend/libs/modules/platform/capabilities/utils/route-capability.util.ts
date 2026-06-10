import { flattenRegistryFeatures } from '../registries/capability-module.registry';

export type RouteCapabilityMapping = {
  route: string;
  moduleKey: string;
  capabilityKeys: string[];
};

export function buildRouteCapabilityMap(): Map<string, RouteCapabilityMapping> {
  const map = new Map<string, RouteCapabilityMapping>();

  for (const feature of flattenRegistryFeatures()) {
    const routes = feature.routeKeys ?? [];
    for (const route of routes) {
      const existing = map.get(route);
      if (existing) {
        if (!existing.capabilityKeys.includes(feature.featureKey)) {
          existing.capabilityKeys.push(feature.featureKey);
        }
        continue;
      }
      map.set(route, {
        route,
        moduleKey: feature.moduleKey,
        capabilityKeys: [feature.featureKey],
      });
    }
  }

  return map;
}

export function getRouteCapabilityMappings(): RouteCapabilityMapping[] {
  return Array.from(buildRouteCapabilityMap().values());
}
