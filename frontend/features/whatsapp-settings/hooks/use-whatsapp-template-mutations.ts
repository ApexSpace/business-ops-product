"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  createWhatsAppTemplate,
  createWhatsAppTemplateWithHeaderSample,
  deleteWhatsAppTemplate,
  syncWhatsAppTemplate,
  syncWhatsAppTemplates,
  updateWhatsAppTemplate,
  type CreateWhatsAppTemplatePayload,
  type WhatsAppTemplateDetail,
} from "@/features/whatsapp-settings/api/whatsapp-templates.api";
import {
  duplicateTemplateName,
  formValuesToComponents,
  normalizeTemplateNameInput,
} from "@/features/whatsapp-settings/utils/whatsapp-template-components.util";
import type { WhatsAppTemplateFormValues } from "@/features/whatsapp-settings/schemas/whatsapp-template.schema";
import { queryKeys } from "@/lib/query/keys";

export function useWhatsAppTemplateMutations() {
  const queryClient = useQueryClient();

  const invalidate = async () => {
    await queryClient.invalidateQueries({
      queryKey: queryKeys.whatsappSettings.templates.all(),
    });
  };

  const createMutation = useMutation({
    mutationFn: async (input: {
      values: WhatsAppTemplateFormValues;
      headerFile?: File | null;
    }) => {
      const payload: CreateWhatsAppTemplatePayload = {
        name: normalizeTemplateNameInput(input.values.name),
        language: input.values.language,
        category: input.values.category,
        components: formValuesToComponents(input.values),
      };

      const mediaHeader = input.values.headerType;
      if (
        mediaHeader === "image" ||
        mediaHeader === "video" ||
        mediaHeader === "document"
      ) {
        if (!input.headerFile) {
          throw new Error("A sample file is required for media headers.");
        }
        return createWhatsAppTemplateWithHeaderSample({
          payload,
          headerFormat: mediaHeader.toUpperCase() as
            | "IMAGE"
            | "VIDEO"
            | "DOCUMENT",
          file: input.headerFile,
        });
      }

      return createWhatsAppTemplate(payload);
    },
    onSuccess: async () => {
      toast.success("Template submitted to Meta for review");
      await invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      values,
    }: {
      id: string;
      values: WhatsAppTemplateFormValues;
    }) =>
      updateWhatsAppTemplate(id, {
        category: values.category,
        components: formValuesToComponents(values),
      }),
    onSuccess: async () => {
      toast.success("Template updated and resubmitted");
      await invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const duplicateMutation = useMutation({
    mutationFn: (template: WhatsAppTemplateDetail) =>
      createWhatsAppTemplate({
        name: duplicateTemplateName(template.name),
        language: template.language,
        category: template.category,
        components: template.components,
        parameterFormat: template.parameterFormat,
      }),
    onSuccess: async () => {
      toast.success("Template duplicated and submitted for review");
      await invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const syncAllMutation = useMutation({
    mutationFn: () => syncWhatsAppTemplates(),
    onSuccess: async (result) => {
      toast.success(`Synced ${result.syncedCount} template(s) from Meta`);
      await invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const syncOneMutation = useMutation({
    mutationFn: (id: string) => syncWhatsAppTemplate(id),
    onSuccess: async () => {
      toast.success("Template status refreshed");
      await invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteWhatsAppTemplate(id),
    onSuccess: async () => {
      toast.success("Template deleted");
      await invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return {
    createMutation,
    updateMutation,
    duplicateMutation,
    syncAllMutation,
    syncOneMutation,
    deleteMutation,
  };
}
