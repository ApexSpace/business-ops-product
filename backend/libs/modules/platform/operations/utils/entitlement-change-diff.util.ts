/**
 * Structured entitlement change records stored on campaign.payload.diff
 * so Ops and email can show what customers gain / lose.
 */

export type EntitlementNamedRef = {
  id: string;
  key: string | null;
  name: string;
};

export type EntitlementServiceRef = {
  key: string;
  name: string;
  description?: string | null;
  moduleName?: string | null;
};

export type EntitlementCapabilityDiffItem = EntitlementNamedRef & {
  services: EntitlementServiceRef[];
};

export type EntitlementAddonDiffItem = EntitlementNamedRef & {
  capability: EntitlementNamedRef;
  services: EntitlementServiceRef[];
  priceMonthly?: string | null;
};

export type EntitlementPriceDiff = {
  previousPriceMonthly: number | null;
  priceMonthly: number | null;
  previousPriceYearly: number | null;
  priceYearly: number | null;
};

export type EntitlementChangeDiff = {
  capabilities?: {
    before?: EntitlementCapabilityDiffItem[];
    after?: EntitlementCapabilityDiffItem[];
    added?: EntitlementCapabilityDiffItem[];
    removed?: EntitlementCapabilityDiffItem[];
  };
  services?: {
    capability?: EntitlementNamedRef;
    before?: EntitlementServiceRef[];
    after?: EntitlementServiceRef[];
    added?: EntitlementServiceRef[];
    removed?: EntitlementServiceRef[];
  };
  addons?: {
    before?: EntitlementAddonDiffItem[];
    after?: EntitlementAddonDiffItem[];
    added?: EntitlementAddonDiffItem[];
    removed?: EntitlementAddonDiffItem[];
  };
  prices?: EntitlementPriceDiff;
};

export function formatMoneyAmount(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '—';
  return `$${Number(value).toFixed(2)}`;
}

function bulletList(lines: string[]): string {
  return lines.map((line) => `• ${line}`).join('\n');
}

function formatServiceLine(service: EntitlementServiceRef): string {
  if (service.moduleName) {
    return `${service.name} (${service.moduleName})`;
  }
  return service.name;
}

function formatCapabilityBlock(
  item: EntitlementCapabilityDiffItem,
): string {
  if (!item.services.length) {
    return item.name;
  }
  const serviceNames = item.services.map((s) => s.name).join(', ');
  return `${item.name} — services: ${serviceNames}`;
}

function formatAddonBlock(item: EntitlementAddonDiffItem): string {
  const parts = [
    item.name,
    `capability: ${item.capability.name}`,
  ];
  if (item.priceMonthly) {
    parts.push(`$${item.priceMonthly}/mo if purchased separately`);
  }
  if (item.services.length) {
    parts.push(`services: ${item.services.map((s) => s.name).join(', ')}`);
  }
  return parts.join(' — ');
}

/**
 * Human-readable multi-line body for email (use white-space: pre-wrap in HTML).
 */
export function formatEntitlementChangeDetail(input: {
  type:
    | 'TIER_PRICE'
    | 'TIER_CAPABILITY'
    | 'CAPABILITY_FEATURE'
    | 'ADDON_PACKAGING';
  diff?: EntitlementChangeDiff | null;
  fallbackMessage?: string | null;
}): string {
  const sections: string[] = [];
  const diff = input.diff;

  if (input.type === 'TIER_PRICE' && diff?.prices) {
    const p = diff.prices;
    sections.push('Plan price change');
    sections.push(
      `Monthly: ${formatMoneyAmount(p.previousPriceMonthly)} → ${formatMoneyAmount(p.priceMonthly)}`,
    );
    sections.push(
      `Yearly: ${formatMoneyAmount(p.previousPriceYearly)} → ${formatMoneyAmount(p.priceYearly)}`,
    );
    sections.push(
      'Your current rate stays until the effective date unless you migrate earlier.',
    );
  }

  if (diff?.capabilities) {
    if (diff.capabilities.removed?.length) {
      sections.push('Capabilities removed from your tier');
      sections.push(
        bulletList(diff.capabilities.removed.map(formatCapabilityBlock)),
      );
    }
    if (diff.capabilities.added?.length) {
      sections.push('Capabilities added to your tier');
      sections.push(
        bulletList(diff.capabilities.added.map(formatCapabilityBlock)),
      );
    }
    if (diff.capabilities.after?.length && input.type === 'TIER_CAPABILITY') {
      sections.push('Capabilities remaining on your tier');
      sections.push(
        bulletList(diff.capabilities.after.map(formatCapabilityBlock)),
      );
    }
  }

  if (diff?.services) {
    const capLabel = diff.services.capability?.name
      ? ` in ${diff.services.capability.name}`
      : '';
    if (diff.services.removed?.length) {
      sections.push(`Services removed${capLabel}`);
      sections.push(
        bulletList(diff.services.removed.map(formatServiceLine)),
      );
    }
    if (diff.services.added?.length) {
      sections.push(`Services added${capLabel}`);
      sections.push(bulletList(diff.services.added.map(formatServiceLine)));
    }
    if (diff.services.after?.length) {
      sections.push(`Services still included${capLabel}`);
      sections.push(bulletList(diff.services.after.map(formatServiceLine)));
    }
  }

  if (diff?.addons) {
    if (diff.addons.removed?.length) {
      sections.push('Add-ons no longer included with your tier');
      sections.push(bulletList(diff.addons.removed.map(formatAddonBlock)));
    }
    if (diff.addons.added?.length) {
      sections.push('Add-ons newly included with your tier');
      sections.push(bulletList(diff.addons.added.map(formatAddonBlock)));
    }
  }

  if (input.type === 'TIER_CAPABILITY') {
    sections.push(
      'After the effective date, removed capabilities (and their services) will no longer be available unless you upgrade your tier or purchase an add-on that includes them.',
    );
  } else if (input.type === 'CAPABILITY_FEATURE') {
    sections.push(
      'After the effective date, removed services will no longer be available unless you upgrade your tier or purchase an add-on that includes them.',
    );
  } else if (input.type === 'ADDON_PACKAGING') {
    sections.push(
      'After the effective date, these add-ons will no longer be included unless you upgrade your tier or purchase them separately.',
    );
  }

  if (sections.length === 0) {
    return (
      input.fallbackMessage?.trim() ||
      'Please review this plan change before the effective date.'
    );
  }

  return sections.join('\n\n');
}

export function mergeEntitlementChangeDiff(
  existing: EntitlementChangeDiff | null | undefined,
  incoming: EntitlementChangeDiff | null | undefined,
): EntitlementChangeDiff {
  const a = existing ?? {};
  const b = incoming ?? {};

  const mergeNamedById = <T extends { id: string }>(
    left?: T[],
    right?: T[],
  ): T[] | undefined => {
    if (!left?.length && !right?.length) return undefined;
    const map = new Map<string, T>();
    for (const item of left ?? []) map.set(item.id, item);
    for (const item of right ?? []) map.set(item.id, item);
    return [...map.values()];
  };

  const mergeServicesByKey = (
    left?: EntitlementServiceRef[],
    right?: EntitlementServiceRef[],
  ): EntitlementServiceRef[] | undefined => {
    if (!left?.length && !right?.length) return undefined;
    const map = new Map<string, EntitlementServiceRef>();
    for (const item of left ?? []) map.set(item.key, item);
    for (const item of right ?? []) map.set(item.key, item);
    return [...map.values()];
  };

  return {
    prices: b.prices ?? a.prices,
    capabilities: {
      before: b.capabilities?.before ?? a.capabilities?.before,
      after: b.capabilities?.after ?? a.capabilities?.after,
      added: mergeNamedById(
        a.capabilities?.added,
        b.capabilities?.added,
      ),
      removed: mergeNamedById(
        a.capabilities?.removed,
        b.capabilities?.removed,
      ),
    },
    services: {
      capability: b.services?.capability ?? a.services?.capability,
      before: b.services?.before ?? a.services?.before,
      after: b.services?.after ?? a.services?.after,
      added: mergeServicesByKey(a.services?.added, b.services?.added),
      removed: mergeServicesByKey(a.services?.removed, b.services?.removed),
    },
    addons: {
      before: b.addons?.before ?? a.addons?.before,
      after: b.addons?.after ?? a.addons?.after,
      added: mergeNamedById(a.addons?.added, b.addons?.added),
      removed: mergeNamedById(a.addons?.removed, b.addons?.removed),
    },
  };
}

export function readDiffFromPayload(
  payload: unknown,
): EntitlementChangeDiff | null {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return null;
  }
  const diff = (payload as { diff?: unknown }).diff;
  if (!diff || typeof diff !== 'object' || Array.isArray(diff)) {
    return null;
  }
  return diff as EntitlementChangeDiff;
}
