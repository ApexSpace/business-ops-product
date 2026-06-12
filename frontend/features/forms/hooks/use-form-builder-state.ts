"use client";

import { useCallback, useMemo, useRef, useState, useEffect, useLayoutEffect } from "react";
import { arrayMove } from "@dnd-kit/sortable";
import type {
  FieldType,
  FormDefinition,
  FormField,
  FormRecord,
  FormSettings,
  PreviewDevice,
} from "@/features/forms/types";
import {
  createDefaultField,
  createDefaultFormSettings,
} from "@/features/forms/utils/field-defaults.util";
import { normalizeFormDefinition } from "@/features/forms/utils/form-normalize.util";

const MAX_HISTORY = 50;

function cloneDefinition(definition: FormDefinition): FormDefinition {
  return structuredClone(definition);
}

function createBlankDefinition(): FormDefinition {
  return {
    fields: [],
    settings: createDefaultFormSettings(),
  };
}

function mapFields(
  fields: FormField[],
  fieldId: string,
  updater: (field: FormField) => FormField,
): FormField[] {
  return fields.map((field) => {
    if (field.id === fieldId) {
      return updater(field);
    }
    if (field.type === "columns" && field.columns) {
      return {
        ...field,
        columns: field.columns.map((column) =>
          mapFields(column, fieldId, updater),
        ),
      };
    }
    return field;
  });
}

function removeFieldById(fields: FormField[], fieldId: string): FormField[] {
  return fields
    .filter((field) => field.id !== fieldId)
    .map((field) => {
      if (field.type === "columns" && field.columns) {
        return {
          ...field,
          columns: field.columns.map((column) =>
            removeFieldById(column, fieldId),
          ),
        };
      }
      return field;
    });
}

export interface UseFormBuilderStateOptions {
  mode: "create" | "edit";
  initialRecord?: FormRecord | null;
}

export function useFormBuilderState({
  mode,
  initialRecord,
}: UseFormBuilderStateOptions) {
  const [formId, setFormId] = useState<string | null>(
    initialRecord?.id ? initialRecord.id : null,
  );
  const [name, setName] = useState(initialRecord?.name ?? "Untitled form");
  const [status, setStatus] = useState(initialRecord?.status ?? "draft");
  const [definition, setDefinition] = useState<FormDefinition>(() =>
    initialRecord
      ? normalizeFormDefinition(cloneDefinition(initialRecord.definition))
      : createBlankDefinition(),
  );
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<PreviewDevice>("desktop");
  const [activeStepIndex, setActiveStepIndex] = useState(0);

  const historyRef = useRef<FormField[][]>([]);
  const historyIndexRef = useRef(0);
  const [historyMeta, setHistoryMeta] = useState({ index: 0, length: 1 });
  const historyInitialized = useRef(false);
  const definitionRef = useRef(definition);

  useLayoutEffect(() => {
    definitionRef.current = definition;
  }, [definition]);

  const markDirty = useCallback(() => setIsDirty(true), []);

  const pushHistory = useCallback((fields: FormField[]) => {
    const snapshot = structuredClone(fields);
    const trimmed = historyRef.current.slice(0, historyIndexRef.current + 1);
    trimmed.push(snapshot);
    while (trimmed.length > MAX_HISTORY) {
      trimmed.shift();
    }
    historyRef.current = trimmed;
    historyIndexRef.current = trimmed.length - 1;
    setHistoryMeta({ index: historyIndexRef.current, length: historyRef.current.length });
  }, []);

  const setFieldsWithHistory = useCallback(
    (updater: (fields: FormField[]) => FormField[]) => {
      setDefinition((current) => {
        const nextFields = updater(current.fields);
        pushHistory(nextFields);
        return { ...current, fields: nextFields };
      });
      markDirty();
    },
    [markDirty, pushHistory],
  );

  const canUndo = historyMeta.index > 0;
  const canRedo = historyMeta.index < historyMeta.length - 1;

  const undo = useCallback(() => {
    if (historyIndexRef.current <= 0) return;
    historyIndexRef.current -= 1;
    const fields = structuredClone(historyRef.current[historyIndexRef.current]);
    setDefinition((current) => ({ ...current, fields }));
    setHistoryMeta({
      index: historyIndexRef.current,
      length: historyRef.current.length,
    });
    markDirty();
  }, [markDirty]);

  const redo = useCallback(() => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return;
    historyIndexRef.current += 1;
    const fields = structuredClone(historyRef.current[historyIndexRef.current]);
    setDefinition((current) => ({ ...current, fields }));
    setHistoryMeta({
      index: historyIndexRef.current,
      length: historyRef.current.length,
    });
    markDirty();
  }, [markDirty]);

  const selectedField = useMemo(() => {
    if (!selectedFieldId) return null;
    const findField = (fields: FormField[]): FormField | null => {
      for (const field of fields) {
        if (field.id === selectedFieldId) return field;
        if (field.type === "columns" && field.columns) {
          for (const column of field.columns) {
            const nested = findField(column);
            if (nested) return nested;
          }
        }
      }
      return null;
    };
    return findField(definition.fields);
  }, [definition.fields, selectedFieldId]);

  const addField = useCallback(
    (type: FieldType, index?: number) => {
      const field = createDefaultField(type, definition.fields.length);
      setFieldsWithHistory((fields) => {
        const next = [...fields];
        const insertAt = index ?? fields.length;
        next.splice(insertAt, 0, field);
        return next;
      });
      setSelectedFieldId(field.id);
      return field;
    },
    [definition.fields.length, setFieldsWithHistory],
  );

  const duplicateField = useCallback(
    (fieldId: string) => {
      setFieldsWithHistory((fields) => {
        const index = fields.findIndex((field) => field.id === fieldId);
        if (index < 0) return fields;
        const source = fields[index];
        const copy = {
          ...structuredClone(source),
          id: createDefaultField(source.type).id,
          name: `${source.name}_copy`,
        };
        const next = [...fields];
        next.splice(index + 1, 0, copy);
        return next;
      });
    },
    [setFieldsWithHistory],
  );

  const removeField = useCallback(
    (fieldId: string) => {
      setFieldsWithHistory((fields) => removeFieldById(fields, fieldId));
      setSelectedFieldId((current) => (current === fieldId ? null : current));
    },
    [setFieldsWithHistory],
  );

  const updateField = useCallback(
    (fieldId: string, patch: Partial<FormField>) => {
      setDefinition((current) => ({
        ...current,
        fields: mapFields(current.fields, fieldId, (field) => ({
          ...field,
          ...patch,
        })),
      }));
      markDirty();
    },
    [markDirty],
  );

  const reorderFields = useCallback(
    (activeId: string, overId: string) => {
      setFieldsWithHistory((fields) => {
        const oldIndex = fields.findIndex((field) => field.id === activeId);
        const newIndex = fields.findIndex((field) => field.id === overId);
        if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) {
          return fields;
        }
        return arrayMove(fields, oldIndex, newIndex);
      });
    },
    [setFieldsWithHistory],
  );

  const moveField = useCallback(
    (fieldId: string, direction: "up" | "down") => {
      setFieldsWithHistory((fields) => {
        const index = fields.findIndex((field) => field.id === fieldId);
        if (index < 0) return fields;
        const target = direction === "up" ? index - 1 : index + 1;
        if (target < 0 || target >= fields.length) return fields;
        return arrayMove(fields, index, target);
      });
    },
    [setFieldsWithHistory],
  );

  const clearForm = useCallback(() => {
    setFieldsWithHistory(() => []);
    setSelectedFieldId(null);
  }, [setFieldsWithHistory]);

  const updateSettings = useCallback(
    (patch: Partial<FormSettings>) => {
      setDefinition((current) => ({
        ...current,
        settings: { ...current.settings, ...patch },
      }));
      markDirty();
    },
    [markDirty],
  );

  const getDefinitionForSave = useCallback((): FormDefinition => {
    return definitionRef.current;
  }, []);

  const applySavedRecord = useCallback((record: FormRecord) => {
    setFormId(record.id);
    setName(record.name);
    setStatus(record.status);
    const cloned = normalizeFormDefinition(cloneDefinition(record.definition));
    setDefinition(cloned);
    historyRef.current = [structuredClone(cloned.fields)];
    historyIndexRef.current = 0;
    setHistoryMeta({ index: 0, length: 1 });
    setIsDirty(false);
    setIsSaving(false);
  }, []);

  const resetDirty = useCallback(() => setIsDirty(false), []);

  useEffect(() => {
    if (historyInitialized.current) return;
    historyInitialized.current = true;
    historyRef.current = [structuredClone(definition.fields)];
    historyIndexRef.current = 0;
    setHistoryMeta({ index: 0, length: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    mode,
    formId,
    setFormId,
    name,
    setName,
    status,
    setStatus,
    definition,
    setDefinition,
    selectedFieldId,
    setSelectedFieldId,
    selectedField,
    isDirty,
    isSaving,
    setIsSaving,
    previewOpen,
    setPreviewOpen,
    previewDevice,
    setPreviewDevice,
    activeStepIndex,
    setActiveStepIndex,
    addField,
    duplicateField,
    removeField,
    updateField,
    reorderFields,
    moveField,
    clearForm,
    updateSettings,
    getDefinitionForSave,
    applySavedRecord,
    resetDirty,
    markDirty,
    undo,
    redo,
    canUndo,
    canRedo,
  };
}

export type FormBuilderStateApi = ReturnType<typeof useFormBuilderState>;
