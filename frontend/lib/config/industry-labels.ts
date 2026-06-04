import type { Industry, IndustryLabels } from "@/lib/types/shared";

export const DEFAULT_INDUSTRY_LABELS: IndustryLabels = {
  contacts: "Contacts",
  pipelines: "Pipelines",
  leads: "Leads",
  workItems: "Work Items",
  appointments: "Appointments",
  conversations: "Conversations",
};

export function getIndustryLabels(
  industry?: Industry | null,
): IndustryLabels {
  if (industry?.labels) {
    return industry.labels;
  }
  return DEFAULT_INDUSTRY_LABELS;
}
