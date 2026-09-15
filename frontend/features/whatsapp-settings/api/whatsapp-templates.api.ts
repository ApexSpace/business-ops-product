import { api } from "@/lib/api/client";
import type { PaginatedList } from "@/lib/api/client";

export type WhatsAppTemplateStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "PAUSED"
  | "DISABLED"
  | "IN_APPEAL"
  | "PENDING_DELETION"
  | "DELETED"
  | "LIMIT_EXCEEDED";

export type WhatsAppTemplateCategory =
  | "MARKETING"
  | "UTILITY"
  | "AUTHENTICATION";

export interface WhatsAppTemplateComponent {
  type: string;
  format?: string;
  text?: string;
  example?: Record<string, unknown>;
  buttons?: Array<Record<string, unknown>>;
}

export interface WhatsAppTemplateListItem {
  id: string;
  name: string;
  language: string;
  category: WhatsAppTemplateCategory;
  status: WhatsAppTemplateStatus;
  bodyPreview: string | null;
  rejectionReason: string | null;
  metaTemplateId: string | null;
  lastSyncedAt: string | null;
  updatedAt: string;
}

export interface WhatsAppTemplateDetail extends WhatsAppTemplateListItem {
  wabaId: string;
  parameterFormat: string;
  components: WhatsAppTemplateComponent[];
  qualityScore: unknown;
  submittedAt: string | null;
  createdAt: string;
  canSend: boolean;
  canEdit: boolean;
  canDelete: boolean;
  editBlockedReason: string | null;
}

export interface WhatsAppTemplateOptions {
  languages: Array<{ code: string; label: string }>;
  categories: Array<{
    value: WhatsAppTemplateCategory;
    label: string;
    description: string;
  }>;
  buttonTypes: Array<{ value: string; label: string }>;
  headerFormats: string[];
}

export interface WhatsAppTemplatesListFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: WhatsAppTemplateStatus;
  category?: WhatsAppTemplateCategory;
  sortBy?: "name" | "updatedAt" | "createdAt" | "status";
  sortOrder?: "asc" | "desc";
}

export interface CreateWhatsAppTemplatePayload {
  name: string;
  language: string;
  category: WhatsAppTemplateCategory;
  components: WhatsAppTemplateComponent[];
  parameterFormat?: string;
}

export interface UpdateWhatsAppTemplatePayload {
  category?: WhatsAppTemplateCategory;
  components?: WhatsAppTemplateComponent[];
  parameterFormat?: string;
}

export function listWhatsAppTemplates(filters: WhatsAppTemplatesListFilters = {}) {
  return api.getPaginated<WhatsAppTemplateListItem>(
    "integrations/business/whatsapp/templates",
    {
      searchParams: {
        page: filters.page,
        limit: filters.limit ?? 50,
        search: filters.search,
        status: filters.status,
        category: filters.category,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
      },
    },
  ) as Promise<PaginatedList<WhatsAppTemplateListItem>>;
}

export function listApprovedWhatsAppTemplates() {
  return api.get<WhatsAppTemplateListItem[]>(
    "integrations/business/whatsapp/templates/approved",
  );
}

export function getWhatsAppTemplateOptions() {
  return api.get<WhatsAppTemplateOptions>(
    "integrations/business/whatsapp/templates/options",
  );
}

export function getWhatsAppTemplate(id: string) {
  return api.get<WhatsAppTemplateDetail>(
    `integrations/business/whatsapp/templates/${id}`,
  );
}

export function createWhatsAppTemplate(payload: CreateWhatsAppTemplatePayload) {
  return api.post<WhatsAppTemplateDetail>(
    "integrations/business/whatsapp/templates",
    payload,
  );
}

export function updateWhatsAppTemplate(
  id: string,
  payload: UpdateWhatsAppTemplatePayload,
) {
  return api.patch<WhatsAppTemplateDetail>(
    `integrations/business/whatsapp/templates/${id}`,
    payload,
  );
}

export function syncWhatsAppTemplates() {
  return api.post<{ syncedCount: number }>(
    "integrations/business/whatsapp/templates/sync",
  );
}

export function syncWhatsAppTemplate(id: string) {
  return api.post<WhatsAppTemplateDetail>(
    `integrations/business/whatsapp/templates/${id}/sync`,
  );
}

export function deleteWhatsAppTemplate(id: string) {
  return api.delete<{ success: boolean }>(
    `integrations/business/whatsapp/templates/${id}`,
  );
}

export async function createWhatsAppTemplateWithHeaderSample(input: {
  payload: CreateWhatsAppTemplatePayload;
  headerFormat: "IMAGE" | "VIDEO" | "DOCUMENT";
  file: File;
}): Promise<WhatsAppTemplateDetail> {
  const formData = new FormData();
  formData.append("file", input.file);
  formData.append("name", input.payload.name);
  formData.append("language", input.payload.language);
  formData.append("category", input.payload.category);
  formData.append("headerFormat", input.headerFormat);
  formData.append("components", JSON.stringify(input.payload.components));
  if (input.payload.parameterFormat) {
    formData.append("parameterFormat", input.payload.parameterFormat);
  }

  const url = new URL(
    "/api/backend/integrations/business/whatsapp/templates/with-header-sample",
    window.location.origin,
  );

  const response = await fetch(url.toString(), {
    method: "POST",
    body: formData,
    credentials: "include",
  });

  const raw = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      typeof raw === "object" &&
      raw !== null &&
      "message" in raw &&
      typeof raw.message === "string"
        ? raw.message
        : "Failed to create template with header sample";
    throw new Error(message);
  }

  const data =
    typeof raw === "object" && raw !== null && "data" in raw
      ? (raw as { data: WhatsAppTemplateDetail }).data
      : (raw as WhatsAppTemplateDetail);

  return data;
}
