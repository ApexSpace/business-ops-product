import type {
  AssignedCapabilityModule,
  ModuleOptionSelections,
  ModuleOptions,
  ModuleSelection,
  ModuleSelections,
  RegistryModuleCatalog,
  RegistryModuleOption,
} from "@/features/platform/types/capability";

export function sortModuleOptions(
  options: RegistryModuleOption[],
): RegistryModuleOption[] {
  return [...options].sort((a, b) => {
    const groupA = a.group ?? "";
    const groupB = b.group ?? "";
    if (groupA !== groupB) return groupA.localeCompare(groupB);
    return a.name.localeCompare(b.name);
  });
}

export function groupModuleOptions(
  options: RegistryModuleOption[],
): Array<{ group: string | null; options: RegistryModuleOption[] }> {
  const sorted = sortModuleOptions(options);
  const groups: Array<{ group: string | null; options: RegistryModuleOption[] }> =
    [];
  let currentGroup: string | null | undefined;

  for (const opt of sorted) {
    const group = opt.group ?? null;
    if (group !== currentGroup) {
      groups.push({ group, options: [opt] });
      currentGroup = group;
    } else {
      groups[groups.length - 1].options.push(opt);
    }
  }

  return groups;
}

export function emptyOptions(
  availableOptions: RegistryModuleOption[],
): ModuleOptions {
  return Object.fromEntries(
    availableOptions.map((opt) => [opt.key, false]),
  ) as ModuleOptions;
}

export function allOptionsEnabled(
  availableOptions: RegistryModuleOption[],
): ModuleOptions {
  return Object.fromEntries(
    availableOptions.map((opt) => [opt.key, true]),
  ) as ModuleOptions;
}

export function buildModuleSelections(
  catalog: RegistryModuleCatalog[],
  assigned: AssignedCapabilityModule[],
): ModuleSelections {
  const assignedMap = new Map(assigned.map((m) => [m.moduleKey, m]));
  const selections: ModuleSelections = {};

  for (const mod of catalog) {
    const assignedMod = assignedMap.get(mod.moduleKey);
    if (assignedMod) {
      selections[mod.moduleKey] = {
        enabled: assignedMod.enabled,
        options: { ...assignedMod.options },
      };
    } else {
      selections[mod.moduleKey] = {
        enabled: false,
        options: emptyOptions(mod.availableOptions),
      };
    }
  }

  return selections;
}

export function moduleSelectionsToSyncPayload(
  selections: ModuleSelections,
): ModuleOptionSelections[] {
  return Object.entries(selections)
    .filter(([, selection]) => selection.enabled)
    .map(([moduleKey, selection]) => ({
      moduleKey,
      options: selection.options,
    }));
}

export function areModuleSelectionsEqual(
  a: ModuleSelections,
  b: ModuleSelections,
): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const key of keys) {
    const left = a[key];
    const right = b[key];
    if (!left || !right) return false;
    if (left.enabled !== right.enabled) return false;
    const optionKeys = new Set([
      ...Object.keys(left.options),
      ...Object.keys(right.options),
    ]);
    for (const optionKey of optionKeys) {
      if (left.options[optionKey] !== right.options[optionKey]) {
        return false;
      }
    }
  }
  return true;
}

export function recomputeModuleEnabled(options: ModuleOptions): boolean {
  return Object.values(options).some(Boolean);
}
