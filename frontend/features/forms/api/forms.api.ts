import type {
  FormDefinition,
  FormListItem,
  FormRecord,
  FormSubmissionListItem,
  FormSubmissionsListFilters,
  FormSubmissionsListResult,
  FormsListFilters,
  FormsListResult,
  FormStatus,
} from "@/features/forms/types";
import {
  normalizeFormRecord,
  prepareFormDefinitionForSave,
} from "@/features/forms/utils/form-normalize.util";
import { api } from "@/lib/api/client";

export const DEFAULT_FORMS_API_BASE = "forms";

type ApiFormStatus = "draft" | "published" | "archived";

interface ApiFormListItem {
  id: string;
  name: string;
  slug: string | null;
  publicKey: string;
  status: ApiFormStatus;
  fieldCount: number;
  submissionCount?: number;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string | null;
  archivedAt?: string | null;
}

interface ApiFormDetail extends ApiFormListItem {
  definition: FormDefinition;
  metadata?: Record<string, unknown> | null;
}

function toFormListItem(item: ApiFormListItem): FormListItem {
  return {
    id: item.id,
    name: item.name,
    slug: item.slug,
    publicKey: item.publicKey,
    status: item.status,
    fieldCount: item.fieldCount,
    submissionCount: item.submissionCount ?? 0,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    publishedAt: item.publishedAt,
    archivedAt: item.archivedAt,
  };
}

function toFormRecord(item: ApiFormDetail): FormRecord {
  return normalizeFormRecord({
    id: item.id,
    name: item.name,
    slug: item.slug,
    publicKey: item.publicKey,
    status: item.status,
    definition: item.definition,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    publishedAt: item.publishedAt,
    archivedAt: item.archivedAt,
  });
}

function listSearchParams(filters: FormsListFilters = {}) {
  return {
    page: filters.page,
    limit: filters.limit,
    search: filters.search,
    status: filters.status && filters.status !== "all" ? filters.status : undefined,
    sortBy: filters.sort,
    sortDir: filters.sortDir,
  };
}

function path(apiBase: string, ...segments: string[]) {
  return [apiBase, ...segments].filter(Boolean).join("/");
}

export async function listForms(
  filters: FormsListFilters = {},
  apiBase: string = DEFAULT_FORMS_API_BASE,
): Promise<FormsListResult> {
  const { items, meta } = await api.getPaginated<ApiFormListItem>(apiBase, {
    searchParams: listSearchParams(filters),
  });

  return {
    items: items.map(toFormListItem),
    meta: {
      total: meta.total,
      page: meta.page,
      limit: meta.limit,
    },
  };
}

export async function getForm(
  id: string,
  apiBase: string = DEFAULT_FORMS_API_BASE,
): Promise<FormRecord> {
  const form = await api.get<ApiFormDetail>(path(apiBase, id));
  return toFormRecord(form);
}

export async function createForm(
  name: string,
  apiBase: string = DEFAULT_FORMS_API_BASE,
): Promise<FormRecord> {
  const form = await api.post<ApiFormDetail>(apiBase, { name: name.trim() });
  return toFormRecord(form);
}

export async function updateForm(
  id: string,
  payload: {
    name?: string;
    definition?: FormDefinition;
    status?: FormStatus;
  },
  apiBase: string = DEFAULT_FORMS_API_BASE,
): Promise<FormRecord> {
  const body = {
    ...payload,
    definition: payload.definition
      ? prepareFormDefinitionForSave(payload.definition)
      : undefined,
  };
  const form = await api.patch<ApiFormDetail>(path(apiBase, id), body);
  return toFormRecord(form);
}

export async function deleteForm(
  id: string,
  apiBase: string = DEFAULT_FORMS_API_BASE,
): Promise<void> {
  await api.delete<void>(path(apiBase, id));
}

export async function duplicateForm(
  id: string,
  apiBase: string = DEFAULT_FORMS_API_BASE,
): Promise<FormRecord> {
  const form = await api.post<ApiFormDetail>(path(apiBase, id, "duplicate"), {});
  return toFormRecord(form);
}

export async function publishForm(
  id: string,
  apiBase: string = DEFAULT_FORMS_API_BASE,
): Promise<FormRecord> {
  const form = await api.post<ApiFormDetail>(path(apiBase, id, "publish"));
  return toFormRecord(form);
}

export async function archiveForm(
  id: string,
  apiBase: string = DEFAULT_FORMS_API_BASE,
): Promise<FormRecord> {
  const form = await api.post<ApiFormDetail>(path(apiBase, id, "archive"));
  return toFormRecord(form);
}

export async function moveFormToDraft(
  id: string,
  apiBase: string = DEFAULT_FORMS_API_BASE,
): Promise<FormRecord> {
  const form = await api.post<ApiFormDetail>(path(apiBase, id, "move-to-draft"));
  return toFormRecord(form);
}

export interface FormEmbed {
  publicKey: string;
  slug: string | null;
  scriptUrl: string;
  iframeUrl: string;
  hostedPageUrl: string;
  embedCode: string;
  iframeEmbed: string;
  isPublished: boolean;
}

export async function getFormEmbed(
  id: string,
  apiBase: string = DEFAULT_FORMS_API_BASE,
): Promise<FormEmbed> {
  return api.get<FormEmbed>(path(apiBase, id, "embed"));
}

interface ApiFormSubmissionListItem {
  id: string;
  formId: string;
  data: Record<string, unknown>;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}

function toFormSubmissionListItem(
  item: ApiFormSubmissionListItem,
): FormSubmissionListItem {
  return {
    id: item.id,
    formId: item.formId,
    data: item.data,
    metadata: item.metadata,
    createdAt: item.createdAt,
  };
}

export async function listFormSubmissions(
  formId: string,
  filters: FormSubmissionsListFilters = {},
  apiBase: string = DEFAULT_FORMS_API_BASE,
): Promise<FormSubmissionsListResult> {
  const { items, meta } = await api.getPaginated<ApiFormSubmissionListItem>(
    path(apiBase, formId, "submissions"),
    {
      searchParams: {
        page: filters.page,
        limit: filters.limit,
        sortDir: filters.sortDir,
      },
    },
  );

  return {
    items: items.map(toFormSubmissionListItem),
    meta: {
      total: meta.total,
      page: meta.page,
      limit: meta.limit,
    },
  };
}

export async function deleteFormSubmission(
  formId: string,
  submissionId: string,
  apiBase: string = DEFAULT_FORMS_API_BASE,
): Promise<void> {
  await api.delete<void>(path(apiBase, formId, "submissions", submissionId));
}
