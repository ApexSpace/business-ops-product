"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileText } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getWhatsAppTemplate,
  listApprovedWhatsAppTemplates,
  type WhatsAppTemplateDetail,
  type WhatsAppTemplateListItem,
} from "@/features/whatsapp-settings/api/whatsapp-templates.api";
import {
  extractTemplateVariableFields,
  getTemplateHeaderMediaRequirement,
  renderTemplatePreviewText,
} from "@/features/conversations/utils/whatsapp-template-send.util";
import { queryKeys } from "@/lib/query/keys";

interface WhatsAppTemplateComposerProps {
  selectedTemplateId: string | null;
  onTemplateIdChange: (templateId: string | null) => void;
  variableValues: Record<string, string>;
  onVariableValueChange: (key: string, value: string) => void;
  headerMediaUrl: string;
  onHeaderMediaUrlChange: (value: string) => void;
  disabled?: boolean;
}

export function WhatsAppTemplateComposer({
  selectedTemplateId,
  onTemplateIdChange,
  variableValues,
  onVariableValueChange,
  headerMediaUrl,
  onHeaderMediaUrlChange,
  disabled = false,
}: WhatsAppTemplateComposerProps) {
  const { data: approvedTemplates = [], isLoading: templatesLoading } = useQuery(
    {
      queryKey: queryKeys.whatsappSettings.templates.approved(),
      queryFn: listApprovedWhatsAppTemplates,
      staleTime: 30_000,
    },
  );

  const { data: selectedTemplate, isLoading: templateDetailLoading } = useQuery(
    {
      queryKey: queryKeys.whatsappSettings.templates.detail(
        selectedTemplateId ?? "",
      ),
      queryFn: () => getWhatsAppTemplate(selectedTemplateId!),
      enabled: Boolean(selectedTemplateId),
      staleTime: 30_000,
    },
  );

  const selectedListItem = useMemo(
    () =>
      approvedTemplates.find((template) => template.id === selectedTemplateId) ??
      null,
    [approvedTemplates, selectedTemplateId],
  );

  const variableFields = selectedTemplate
    ? extractTemplateVariableFields(selectedTemplate.components)
    : [];
  const headerMediaRequirement = selectedTemplate
    ? getTemplateHeaderMediaRequirement(selectedTemplate.components)
    : null;

  const livePreview = selectedTemplate
    ? renderTemplatePreviewText(
        selectedTemplate.components,
        variableValues,
        selectedTemplate.name,
      )
    : null;

  return (
    <div className="space-y-3 rounded-lg border border-border/70 bg-muted/10 p-3">
      <div className="flex items-center gap-2">
        <FileText className="size-4 text-muted-foreground" />
        <p className="text-sm font-medium">Send WhatsApp template</p>
        <Badge variant="secondary" className="ml-auto text-[10px]">
          Outside 24h window
        </Badge>
      </div>

      <div>
        <p className="mb-1.5 text-xs font-medium text-muted-foreground">
          Approved template
        </p>
        <Select
          value={selectedTemplateId ?? ""}
          onValueChange={(value) => onTemplateIdChange(value ? value : null)}
          disabled={disabled || templatesLoading}
        >
          <SelectTrigger className="h-10 w-full bg-background">
            <SelectValue
              placeholder={
                templatesLoading
                  ? "Loading templates…"
                  : approvedTemplates.length === 0
                    ? "No approved templates"
                    : "Choose a template"
              }
            >
              {selectedListItem
                ? `${selectedListItem.name} (${selectedListItem.language})`
                : selectedTemplate
                  ? `${selectedTemplate.name} (${selectedTemplate.language})`
                  : null}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {approvedTemplates.map((template: WhatsAppTemplateListItem) => (
              <SelectItem key={template.id} value={template.id}>
                <div className="flex flex-col items-start gap-0.5">
                  <span className="font-medium">
                    {template.name} ({template.language})
                  </span>
                  {template.bodyPreview ? (
                    <span className="line-clamp-1 text-xs text-muted-foreground">
                      {template.bodyPreview}
                    </span>
                  ) : null}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedTemplate ? (
        <div className="rounded-md border border-dashed border-border/70 bg-background px-3 py-2.5">
          <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Preview
          </p>
          <p className="whitespace-pre-wrap text-sm text-foreground">
            {templateDetailLoading
              ? "Loading template…"
              : livePreview || selectedTemplate.bodyPreview || "Template message"}
          </p>
        </div>
      ) : null}

      {variableFields.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            Template variables
          </p>
          {variableFields.map((field) => (
            <div key={field.key}>
              <p className="mb-1 text-xs text-muted-foreground">{field.label}</p>
              <Input
                value={variableValues[field.key] ?? ""}
                onChange={(event) =>
                  onVariableValueChange(field.key, event.target.value)
                }
                placeholder={`Enter value for {{${field.index}}}`}
                disabled={disabled || templateDetailLoading}
                className="h-9 bg-background"
              />
            </div>
          ))}
        </div>
      ) : null}

      {headerMediaRequirement ? (
        <div>
          <p className="mb-1 text-xs font-medium text-muted-foreground">
            {headerMediaRequirement.label}
          </p>
          <Input
            value={headerMediaUrl}
            onChange={(event) => onHeaderMediaUrlChange(event.target.value)}
            placeholder="Paste a public media URL"
            disabled={disabled || templateDetailLoading}
            className="h-9 bg-background"
          />
        </div>
      ) : null}
    </div>
  );
}

export type { WhatsAppTemplateDetail };
