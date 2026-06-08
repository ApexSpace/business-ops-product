import { DEFAULT_TERMINOLOGY } from "@/lib/config/snapshot/default-terminology";
import {
  entityFieldToKey,
  type EntityLabelField,
  type SnapshotEntityId,
} from "@/lib/config/snapshot/entity-label-registry";
import type { IndustryLabels } from "@/lib/types/shared";

export function resolveTerminology(
  key: string,
  fallback: string,
  terminology?: Record<string, string>,
): string {
  const value = terminology?.[key]?.trim();
  if (value) return value;

  const defaultValue = DEFAULT_TERMINOLOGY[key]?.trim();
  if (defaultValue) return defaultValue;

  return fallback;
}

export function createTerminologyResolver(
  terminology?: Record<string, string>,
): (key: string, fallback: string) => string {
  return (key, fallback) => resolveTerminology(key, fallback, terminology);
}

export function resolveEntityLabel(
  entity: SnapshotEntityId,
  field: EntityLabelField,
  fallback: string,
  terminology?: Record<string, string>,
): string {
  return resolveTerminology(
    entityFieldToKey(entity, field),
    fallback,
    terminology,
  );
}

export function createEntityLabelResolver(
  terminology?: Record<string, string>,
): (entity: SnapshotEntityId, field: EntityLabelField, fallback: string) => string {
  return (entity, field, fallback) =>
    resolveEntityLabel(entity, field, fallback, terminology);
}

/** Maps snapshot terminology to legacy nav label keys used by contact/workspace UIs. */
export function resolveNavEntityLabels(
  terminology?: Record<string, string>,
): IndustryLabels {
  const t = createTerminologyResolver(terminology);
  const tEntity = createEntityLabelResolver(terminology);

  return {
    contacts: tEntity("contact", "name", t("nav.contacts", "Contacts")),
    pipelines: tEntity("pipeline", "name", t("nav.pipelines", "CRM Pipeline")),
    leads: tEntity("lead", "name", t("nav.leads", "Leads")),
    workItems: tEntity("workItem", "name", t("nav.workItems", "Work Items")),
    appointments: tEntity(
      "appointment",
      "name",
      t("nav.appointments", "Appointments"),
    ),
    conversations: tEntity(
      "conversation",
      "name",
      t("nav.conversations", "Conversations"),
    ),
  };
}
