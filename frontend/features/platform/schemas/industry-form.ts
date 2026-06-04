import { z } from "zod";
import type {
  Industry,
  IndustryLabels,
  IndustryPipelineTemplate,
} from "@/features/platform/types";
import { DEFAULT_INDUSTRY_LABELS } from "@/lib/config/industry-labels";

export const industryFormSchema = z.object({
  name: z.string().min(2, "Name is required"),
  description: z.string().optional(),
  contactsLabel: z.string().min(1),
  pipelinesLabel: z.string().min(1),
  leadsLabel: z.string().min(1),
  workItemsLabel: z.string().min(1),
  appointmentsLabel: z.string().min(1),
  conversationsLabel: z.string().min(1),
  pipelineName: z.string().min(1, "Pipeline name is required"),
  stagesText: z.string().min(1, "Add at least one pipeline stage (one per line)"),
  status: z.enum(["ACTIVE", "ARCHIVED"]).optional(),
});

export type IndustryFormValues = z.infer<typeof industryFormSchema>;

export const industryFormDefaults: IndustryFormValues = {
  name: "",
  description: "",
  contactsLabel: DEFAULT_INDUSTRY_LABELS.contacts,
  pipelinesLabel: DEFAULT_INDUSTRY_LABELS.pipelines,
  leadsLabel: DEFAULT_INDUSTRY_LABELS.leads,
  workItemsLabel: DEFAULT_INDUSTRY_LABELS.workItems,
  appointmentsLabel: DEFAULT_INDUSTRY_LABELS.appointments,
  conversationsLabel: DEFAULT_INDUSTRY_LABELS.conversations,
  pipelineName: "Sales Pipeline",
  stagesText: "New Lead\nContacted\nQualified\nWon\nLost",
  status: "ACTIVE",
};

function parseStages(text: string): IndustryPipelineTemplate["stages"] {
  const names = text
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  return names.map((name, index) => {
    const lower = name.toLowerCase();
    let type: "OPEN" | "WON" | "LOST" | undefined = "OPEN";
    if (lower === "won" || lower.includes("closed won")) type = "WON";
    else if (lower === "lost") type = "LOST";
    else if (index === names.length - 1 && type === "OPEN") type = undefined;
    return { name, type };
  });
}

export function industryFormToApiBody(
  values: IndustryFormValues,
  options?: { sortOrder?: number },
) {
  const labels: IndustryLabels = {
    contacts: values.contactsLabel.trim(),
    pipelines: values.pipelinesLabel.trim(),
    leads: values.leadsLabel.trim(),
    workItems: values.workItemsLabel.trim(),
    appointments: values.appointmentsLabel.trim(),
    conversations: values.conversationsLabel.trim(),
  };

  const pipelineTemplate: IndustryPipelineTemplate = {
    pipelineName: values.pipelineName.trim(),
    stages: parseStages(values.stagesText),
  };

  return {
    name: values.name.trim(),
    description: values.description?.trim() || undefined,
    labels,
    pipelineTemplate,
    sortOrder: options?.sortOrder ?? 0,
    ...(values.status ? { status: values.status } : {}),
  };
}

export function industryToFormValues(industry: Industry): IndustryFormValues {
  return {
    name: industry.name,
    description: industry.description ?? "",
    contactsLabel: industry.labels.contacts,
    pipelinesLabel: industry.labels.pipelines,
    leadsLabel: industry.labels.leads,
    workItemsLabel: industry.labels.workItems,
    appointmentsLabel: industry.labels.appointments,
    conversationsLabel: industry.labels.conversations,
    pipelineName: industry.pipelineTemplate.pipelineName,
    stagesText: industry.pipelineTemplate.stages
      .map((s) => s.name)
      .join("\n"),
    status: industry.status,
  };
}
