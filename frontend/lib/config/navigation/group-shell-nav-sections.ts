import type { ShellNavItem, ShellNavSection } from "@/lib/types/shell-nav";
import {
  BUSINESS_NAV_SECTION_DEFINITIONS,
  resolveNavSectionId,
} from "@/lib/config/navigation/business-nav-sections";

export function groupShellNavItemsIntoSections(
  items: ShellNavItem[],
): ShellNavSection[] {
  const buckets = new Map<string, ShellNavItem[]>(
    BUSINESS_NAV_SECTION_DEFINITIONS.map((section) => [section.id, []]),
  );
  const overflow: ShellNavItem[] = [];

  for (const item of items) {
    const sectionId = item.navKey ? resolveNavSectionId(item.navKey) : null;
    if (sectionId && buckets.has(sectionId)) {
      buckets.get(sectionId)!.push(item);
    } else {
      overflow.push(item);
    }
  }

  const sections: ShellNavSection[] = BUSINESS_NAV_SECTION_DEFINITIONS.map(
    (definition) => ({
      id: definition.id,
      label: definition.label,
      items: buckets.get(definition.id) ?? [],
    }),
  ).filter((section) => section.items.length > 0);

  if (overflow.length > 0) {
    sections.push({ id: "more", label: "More", items: overflow });
  }

  return sections;
}
