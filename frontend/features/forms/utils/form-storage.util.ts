import type { FormDefinition, FormRecord, FormStatus } from "@/features/forms/types";
import {
  createDefaultFormSettings,
  createDefaultField,
} from "@/features/forms/utils/field-defaults.util";
import { normalizeFormRecord } from "@/features/forms/utils/form-normalize.util";

const STORAGE_KEY = "codesol_forms";

function generateId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `form_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function isClient(): boolean {
  return typeof window !== "undefined";
}

function readAll(): FormRecord[] {
  if (!isClient()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as FormRecord[];
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeFormRecord);
  } catch {
    return [];
  }
}

function writeAll(forms: FormRecord[]): void {
  if (!isClient()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(forms));
}

function nowIso(): string {
  return new Date().toISOString();
}

function defaultDefinition(name: string): FormDefinition {
  return {
    fields: [createDefaultField("text")],
    settings: {
      ...createDefaultFormSettings(),
      title: name,
    },
  };
}

export function getFormsFromStorage(): FormRecord[] {
  return readAll().sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

export function getFormById(id: string): FormRecord | null {
  return readAll().find((form) => form.id === id) ?? null;
}

export function createNewForm(name: string): FormRecord {
  const timestamp = nowIso();
  const record: FormRecord = {
    id: generateId(),
    name: name.trim() || "Untitled form",
    status: "draft",
    definition: defaultDefinition(name.trim() || "Untitled form"),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  const forms = readAll();
  forms.unshift(record);
  writeAll(forms);
  return record;
}

export function saveFormToStorage(
  id: string,
  updates: {
    name?: string;
    definition?: FormDefinition;
    status?: FormStatus;
  },
): FormRecord {
  const forms = readAll();
  const index = forms.findIndex((form) => form.id === id);
  if (index < 0) {
    throw new Error("Form not found");
  }
  const current = forms[index];
  const next: FormRecord = {
    ...current,
    ...updates,
    definition: updates.definition ?? current.definition,
    updatedAt: nowIso(),
  };
  forms[index] = next;
  writeAll(forms);
  return next;
}

export function deleteFormFromStorage(id: string): void {
  const forms = readAll().filter((form) => form.id !== id);
  writeAll(forms);
}

export function duplicateFormInStorage(id: string): FormRecord {
  const source = getFormById(id);
  if (!source) {
    throw new Error("Form not found");
  }
  const timestamp = nowIso();
  const copy: FormRecord = {
    ...source,
    id: generateId(),
    name: `${source.name} (copy)`,
    status: "draft",
    definition: structuredClone(source.definition),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  const forms = readAll();
  forms.unshift(copy);
  writeAll(forms);
  return copy;
}

export function updateFormStatus(id: string, status: FormStatus): FormRecord {
  return saveFormToStorage(id, { status });
}
