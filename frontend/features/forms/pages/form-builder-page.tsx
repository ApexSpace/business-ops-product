"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDeleteDialog } from "@/components/forms/confirm-delete-dialog";
import { ApiErrorState } from "@/components/data-display/api-error-state";
import { LoadingState } from "@/components/data-display/loading-state";
import { FullScreenEditorLayout } from "@/components/layout/full-screen-editor-layout";
import { FormBuilderShell } from "@/features/forms/components/builder/form-builder-shell";
import { useFormDetail } from "@/features/forms/hooks/use-form-detail";
import { useFormBuilderState } from "@/features/forms/hooks/use-form-builder-state";
import { useFormMutations } from "@/features/forms/hooks/use-form-mutations";
import type { FormRecord } from "@/features/forms/types";
import {
  createDefaultField,
  createDefaultFormSettings,
} from "@/features/forms/utils/field-defaults.util";
import { downloadFormJson } from "@/features/forms/utils/form-display.util";
import { prepareFormDefinitionForSave } from "@/features/forms/utils/form-normalize.util";
import { useDirtyFormWarning } from "@/lib/forms/use-dirty-form-warning";

interface FormBuilderPageProps {
  mode: "create" | "edit";
  formId?: string;
}

interface FormBuilderEditorProps {
  mode: "create" | "edit";
  initialRecord?: FormRecord | null;
}

function FormBuilderEditor({ mode, initialRecord }: FormBuilderEditorProps) {
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);

  const builder = useFormBuilderState({
    mode,
    initialRecord,
  });

  const {
    createMutation,
    updateMutation,
    deleteMutation,
    duplicateMutation,
    publishMutation,
    draftMutation,
    archiveMutation,
  } = useFormMutations();

  useDirtyFormWarning(builder.isDirty);

  const buildPayload = () => {
    const currentDefinition = builder.getDefinitionForSave();
    const definition = prepareFormDefinitionForSave({
      ...currentDefinition,
      settings: {
        ...currentDefinition.settings,
        title:
          currentDefinition.settings.title.trim() ||
          builder.name.trim() ||
          "Untitled form",
      },
    });

    return {
      name: builder.name.trim() || "Untitled form",
      definition,
    };
  };

  const handleSave = () => {
    builder.setIsSaving(true);
    const payload = buildPayload();

    if (builder.formId) {
      updateMutation.mutate(
        { id: builder.formId, ...payload },
        {
          onSuccess: (record) => {
            builder.applySavedRecord(record);
          },
          onError: () => builder.setIsSaving(false),
        },
      );
      return;
    }

    createMutation.mutate(payload.name, {
      onSuccess: (record) => {
        updateMutation.mutate(
          { id: record.id, ...payload },
          {
            onSuccess: (updated) => {
              builder.applySavedRecord(updated);
              router.replace(`/business/settings/forms/${updated.id}/edit`);
            },
            onError: () => builder.setIsSaving(false),
          },
        );
      },
      onError: () => builder.setIsSaving(false),
    });
  };

  const handlePublish = () => {
    const runPublish = (id: string) => {
      publishMutation.mutate(id, {
        onSuccess: (record) => builder.setStatus(record.status),
      });
    };

    if (builder.formId) {
      runPublish(builder.formId);
      return;
    }

    builder.setIsSaving(true);
    const payload = buildPayload();
    createMutation.mutate(payload.name, {
      onSuccess: (record) => {
        updateMutation.mutate(
          { id: record.id, ...payload },
          {
            onSuccess: (updated) => {
              builder.applySavedRecord(updated);
              router.replace(`/business/settings/forms/${updated.id}/edit`);
              runPublish(updated.id);
            },
            onError: () => builder.setIsSaving(false),
          },
        );
      },
      onError: () => builder.setIsSaving(false),
    });
  };

  const handleMoveToDraft = () => {
    if (!builder.formId) return;
    draftMutation.mutate(builder.formId, {
      onSuccess: (record) => builder.setStatus(record.status),
    });
  };

  const handleDuplicate = () => {
    if (!builder.formId) return;
    duplicateMutation.mutate(builder.formId, {
      onSuccess: (record) => {
        router.push(`/business/settings/forms/${record.id}/edit`);
      },
    });
  };

  const handleArchive = () => {
    if (!builder.formId) return;
    archiveMutation.mutate(builder.formId, {
      onSuccess: (record) => {
        builder.setStatus(record.status);
      },
    });
  };

  const handleExport = () => {
    if (!builder.formId) return;
    downloadFormJson({
      id: builder.formId,
      name: builder.name,
      status: builder.status,
      definition: builder.definition,
      createdAt: initialRecord?.createdAt ?? new Date().toISOString(),
      updatedAt: initialRecord?.updatedAt ?? new Date().toISOString(),
    });
  };

  const handleDelete = () => {
    if (!builder.formId) return;
    deleteMutation.mutate(builder.formId, {
      onSuccess: () => {
        setDeleteOpen(false);
        router.push("/business/settings/forms");
      },
    });
  };

  return (
    <>
      <FormBuilderShell
        builder={builder}
        onSave={handleSave}
        onPublish={handlePublish}
        onMoveToDraft={handleMoveToDraft}
        onDuplicate={handleDuplicate}
        onArchive={handleArchive}
        onExport={handleExport}
        onDelete={() => setDeleteOpen(true)}
      />

      <ConfirmDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete form?"
        description="This form will be permanently removed."
        isPending={deleteMutation.isPending}
        onConfirm={handleDelete}
      />
    </>
  );
}

export function FormBuilderPage({ mode, formId }: FormBuilderPageProps) {
  const {
    data: formRecord,
    isLoading,
    isError,
    error,
    refetch,
  } = useFormDetail(mode === "edit" ? formId : null);

  if (mode === "edit" && isLoading) {
    return (
      <FullScreenEditorLayout
        backHref="/business/settings/forms"
        backLabel="Back to forms"
        title="Form builder"
      >
        <div className="min-h-0 flex-1 overflow-y-auto px-[var(--page-padding-x)] py-[var(--page-padding-y)]">
          <LoadingState variant="skeleton" rows={6} />
        </div>
      </FullScreenEditorLayout>
    );
  }

  if (mode === "edit" && isError) {
    return (
      <FullScreenEditorLayout
        backHref="/business/settings/forms"
        backLabel="Back to forms"
        title="Form builder"
      >
        <div className="min-h-0 flex-1 overflow-y-auto px-[var(--page-padding-x)] py-[var(--page-padding-y)]">
          <ApiErrorState
            error={error}
            title="Unable to load form"
            onRetry={() => void refetch()}
          />
        </div>
      </FullScreenEditorLayout>
    );
  }

  const createSeed: FormRecord | null =
    mode === "create"
      ? {
          id: "",
          name: "Untitled form",
          status: "draft",
          definition: {
            fields: [createDefaultField("text")],
            settings: {
              ...createDefaultFormSettings(),
              title: "Untitled form",
            },
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      : null;

  return (
    <FullScreenEditorLayout>
      <FormBuilderEditor
        key={formRecord?.id ?? "create"}
        mode={mode}
        initialRecord={mode === "edit" ? formRecord : createSeed}
      />
    </FullScreenEditorLayout>
  );
}
