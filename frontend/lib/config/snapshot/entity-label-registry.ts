import { DEFAULT_TERMINOLOGY } from "./default-terminology";

export const SNAPSHOT_ENTITIES = [
  "contact",
  "lead",
  "pipeline",
  "workItem",
  "appointment",
  "invoice",
  "estimate",
  "conversation",
  "payment",
] as const;

export type SnapshotEntityId = (typeof SNAPSHOT_ENTITIES)[number];

export const ENTITY_LABEL_FIELDS = [
  "menu_name",
  "name",
  "singular_name",
  "all_items",
  "add_new",
  "add_new_item",
  "edit_item",
  "new_item",
  "view_item",
  "view_items",
  "search_items",
  "not_found",
  "not_found_in_trash",
  "item_published",
  "item_updated",
] as const;

export type EntityLabelField = (typeof ENTITY_LABEL_FIELDS)[number];

export type EntityLabels = {
  [K in EntityLabelField]?: string;
} & {
  name: string;
  singular_name: string;
  menu_name: string;
  all_items: string;
  add_new: string;
  add_new_item: string;
  edit_item: string;
  new_item: string;
  view_item: string;
  view_items: string;
  search_items: string;
  not_found: string;
  not_found_in_trash: string;
};

const ENTITY_FIELD_SUFFIX: Record<
  Exclude<EntityLabelField, "name" | "menu_name">,
  string
> = {
  singular_name: "singular",
  all_items: "allItems",
  add_new: "addNew",
  add_new_item: "addNewItem",
  edit_item: "editItem",
  new_item: "newItem",
  view_item: "viewItem",
  view_items: "viewItems",
  search_items: "searchItems",
  not_found: "notFound",
  not_found_in_trash: "notFoundInTrash",
  item_published: "itemPublished",
  item_updated: "itemUpdated",
};

export const ENTITY_NAV_KEYS: Record<SnapshotEntityId, string> = {
  contact: "nav.contacts",
  lead: "nav.leads",
  pipeline: "nav.pipelines",
  workItem: "nav.workItems",
  appointment: "nav.appointments",
  invoice: "nav.invoices",
  estimate: "nav.estimates",
  conversation: "nav.conversations",
  payment: "nav.payments",
};

export const NAV_LABEL_KEYS = [
  "nav.dashboard",
  "nav.contacts",
  "nav.leads",
  "nav.conversations",
  "nav.pipelines",
  "nav.workItems",
  "nav.appointments",
  "nav.invoices",
  "nav.estimates",
  "nav.payments",
] as const;

const ENTITY_NAV_KEY_SET = new Set<string>(Object.values(ENTITY_NAV_KEYS));

export type OrphanNavLabelKey = Exclude<
  (typeof NAV_LABEL_KEYS)[number],
  (typeof ENTITY_NAV_KEYS)[SnapshotEntityId]
>;

/** Nav keys not tied to any entity card (e.g. dashboard). */
export function deriveOrphanNavLabelKeys(): OrphanNavLabelKey[] {
  return NAV_LABEL_KEYS.filter(
    (key) => !ENTITY_NAV_KEY_SET.has(key),
  ) as OrphanNavLabelKey[];
}

/** Nav keys not tied to any entity card (e.g. dashboard). */
export const ORPHAN_NAV_LABEL_KEYS: OrphanNavLabelKey[] =
  deriveOrphanNavLabelKeys();

export const ORPHAN_NAV_FIELD_LABELS: Record<OrphanNavLabelKey, string> = {
  "nav.dashboard": "Dashboard",
};

export const ACTION_LABEL_KEYS = ["actions.bookAppointment"] as const;

export const ENTITY_DISPLAY_NAMES: Record<SnapshotEntityId, string> = {
  contact: "Contact",
  lead: "Lead",
  pipeline: "Pipeline",
  workItem: "Work Item",
  appointment: "Appointment",
  invoice: "Invoice",
  estimate: "Estimate",
  conversation: "Conversation",
  payment: "Payment",
};

export const ENTITY_FIELD_LABELS: Record<EntityLabelField, string> = {
  name: "Plural name",
  singular_name: "Singular name",
  menu_name: "Sidebar label",
  all_items: "All items",
  add_new: "Add new",
  add_new_item: "Add new item",
  edit_item: "Edit item",
  new_item: "New item",
  view_item: "View item",
  view_items: "View items",
  search_items: "Search items",
  not_found: "Not found",
  not_found_in_trash: "Not found in trash",
  item_published: "Item published",
  item_updated: "Item updated",
};

const OPTIONAL_ENTITY_FIELDS = new Set<EntityLabelField>([
  "item_published",
  "item_updated",
]);

export function entityFieldToKey(
  entity: SnapshotEntityId,
  field: EntityLabelField,
): string {
  if (field === "menu_name") {
    return ENTITY_NAV_KEYS[entity];
  }
  if (field === "name") {
    return `entities.${entity}.plural`;
  }
  return `entities.${entity}.${ENTITY_FIELD_SUFFIX[field]}`;
}

function readEntityField(
  terminology: Record<string, string>,
  entity: SnapshotEntityId,
  field: EntityLabelField,
): string | undefined {
  const key = entityFieldToKey(entity, field);
  const value = terminology[key]?.trim();
  return value || undefined;
}

export const DEFAULT_ENTITY_LABELS: Record<SnapshotEntityId, EntityLabels> =
  SNAPSHOT_ENTITIES.reduce(
    (acc, entityId) => {
      const labels = {} as EntityLabels;
      for (const field of ENTITY_LABEL_FIELDS) {
        const key = entityFieldToKey(entityId, field);
        const value = DEFAULT_TERMINOLOGY[key];
        if (value) {
          labels[field] = value;
        }
      }
      acc[entityId] = labels;
      return acc;
    },
    {} as Record<SnapshotEntityId, EntityLabels>,
  );

export function expandEntityLabels(
  terminology: Record<string, string> = {},
): Record<SnapshotEntityId, EntityLabels> {
  const result = {} as Record<SnapshotEntityId, EntityLabels>;

  for (const entityId of SNAPSHOT_ENTITIES) {
    const defaults = DEFAULT_ENTITY_LABELS[entityId];
    const expanded = { ...defaults };

    for (const field of ENTITY_LABEL_FIELDS) {
      const value = readEntityField(terminology, entityId, field);
      if (value) {
        expanded[field] = value;
      } else if (!OPTIONAL_ENTITY_FIELDS.has(field)) {
        expanded[field] = defaults[field] ?? "";
      }
    }

    result[entityId] = expanded;
  }

  return result;
}

export function flattenEntityLabels(
  entities: Record<SnapshotEntityId, EntityLabels>,
  existing: Record<string, string> = {},
): Record<string, string> {
  const result = { ...existing };

  for (const entityId of SNAPSHOT_ENTITIES) {
    const entity = entities[entityId];
    for (const field of ENTITY_LABEL_FIELDS) {
      const key = entityFieldToKey(entityId, field);
      const value = entity[field]?.trim();

      if (OPTIONAL_ENTITY_FIELDS.has(field)) {
        if (value) {
          result[key] = value;
        } else {
          delete result[key];
        }
        continue;
      }

      if (value) {
        result[key] = value;
      }
    }
  }

  return result;
}

export function resetEntityLabels(
  entityId: SnapshotEntityId,
  terminology: Record<string, string>,
): Record<string, string> {
  const expanded = expandEntityLabels(terminology);
  expanded[entityId] = { ...DEFAULT_ENTITY_LABELS[entityId] };
  return flattenEntityLabels(expanded, terminology);
}
