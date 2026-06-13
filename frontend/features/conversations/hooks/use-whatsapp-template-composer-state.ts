"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getWhatsAppTemplate } from "@/features/whatsapp-settings/api/whatsapp-templates.api";
import type {
  ContactReplyChannel,
  Conversation,
  ConversationChannel,
  ConversationMessage,
} from "@/features/conversations/api/conversations.api";
import {
  buildTemplateSendComponents,
  isTemplateSendReady,
  renderTemplatePreviewText,
} from "@/features/conversations/utils/whatsapp-template-send.util";
import {
  resolveWhatsAppComposerMode,
  type WhatsAppComposerMode,
} from "@/features/conversations/utils/reply-channel.utils";
import { queryKeys } from "@/lib/query/keys";

export function useWhatsAppTemplateComposerState(input: {
  activeReplyChannel: ContactReplyChannel | null;
  conversation?: Conversation | null;
  messages: ConversationMessage[];
  selectedReplyChannel: ConversationChannel | null;
}) {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    null,
  );
  const [templateVariableValues, setTemplateVariableValues] = useState<
    Record<string, string>
  >({});
  const [templateHeaderMediaUrl, setTemplateHeaderMediaUrl] = useState("");

  const whatsAppMode = useMemo(
    () =>
      resolveWhatsAppComposerMode({
        channel: input.activeReplyChannel,
        conversation: input.conversation,
        messages: input.messages,
      }),
    [input.activeReplyChannel, input.conversation, input.messages],
  );

  const { data: selectedTemplate } = useQuery({
    queryKey: queryKeys.whatsappSettings.templates.detail(
      selectedTemplateId ?? "",
    ),
    queryFn: () => getWhatsAppTemplate(selectedTemplateId!),
    enabled: Boolean(selectedTemplateId),
    staleTime: 30_000,
  });

  useEffect(() => {
    setSelectedTemplateId(null);
    setTemplateVariableValues({});
    setTemplateHeaderMediaUrl("");
  }, [input.selectedReplyChannel]);

  const handleTemplateIdChange = useCallback((templateId: string | null) => {
    setSelectedTemplateId(templateId);
    setTemplateVariableValues({});
    setTemplateHeaderMediaUrl("");
  }, []);

  const handleTemplateVariableValueChange = useCallback(
    (key: string, value: string) => {
      setTemplateVariableValues((current) => ({ ...current, [key]: value }));
    },
    [],
  );

  const hasTemplateContent = useMemo(() => {
    if (!whatsAppMode?.requiresTemplate || !selectedTemplate) {
      return false;
    }

    return isTemplateSendReady({
      components: selectedTemplate.components,
      values: templateVariableValues,
      headerMediaUrl: templateHeaderMediaUrl,
    });
  }, [
    selectedTemplate,
    templateHeaderMediaUrl,
    templateVariableValues,
    whatsAppMode?.requiresTemplate,
  ]);

  const templatePreviewText = useMemo(() => {
    if (!selectedTemplate) return "";
    return renderTemplatePreviewText(
      selectedTemplate.components,
      templateVariableValues,
      selectedTemplate.name,
    );
  }, [selectedTemplate, templateVariableValues]);

  const buildTemplatePayload = useCallback(() => {
    if (!selectedTemplate) {
      return undefined;
    }

    const headerMediaRequirement = selectedTemplate.components.find(
      (component) => component.type?.toUpperCase() === "HEADER",
    );
    const headerFormat = headerMediaRequirement?.format?.toUpperCase();
    const headerMedia =
      headerFormat === "IMAGE" ||
      headerFormat === "VIDEO" ||
      headerFormat === "DOCUMENT"
        ? {
            type: headerFormat.toLowerCase(),
            url: templateHeaderMediaUrl.trim(),
          }
        : undefined;

    return {
      name: selectedTemplate.name,
      language: selectedTemplate.language,
      components: buildTemplateSendComponents(
        selectedTemplate.components,
        templateVariableValues,
      ),
      headerMedia,
    };
  }, [selectedTemplate, templateHeaderMediaUrl, templateVariableValues]);

  const resetTemplateComposer = useCallback(() => {
    setSelectedTemplateId(null);
    setTemplateVariableValues({});
    setTemplateHeaderMediaUrl("");
  }, []);

  return {
    whatsAppMode,
    selectedTemplateId,
    handleTemplateIdChange,
    templateVariableValues,
    handleTemplateVariableValueChange,
    templateHeaderMediaUrl,
    setTemplateHeaderMediaUrl,
    hasTemplateContent,
    buildTemplatePayload,
    templatePreviewText,
    resetTemplateComposer,
  };
}

export type { WhatsAppComposerMode };
