import { api } from "@/lib/api/client";
import type { Lead, PaginatedResult } from "@/features/leads/types";

export type LeadsListFilters = {
  page?: number;
  limit?: number;
  search?: string;
  pipelineId?: string;
  pipelineStageId?: string;
  status?: string;
  contactId?: string;
};

export async function listLeads(
  filters: LeadsListFilters = {},
): Promise<PaginatedResult<Lead>> {
  const { items, meta } = await api.getPaginated<Lead>("leads", {
    searchParams: {
      page: filters.page,
      limit: filters.limit,
      search: filters.search,
      pipelineId: filters.pipelineId,
      pipelineStageId: filters.pipelineStageId,
      status: filters.status,
      contactId: filters.contactId,
    },
  });
  return { items, meta };
}

export function getLead(id: string) {
  return api.get<Lead>(`leads/${id}`);
}

export function createLead(body: Record<string, unknown>) {
  return api.post<Lead>("leads", body);
}

export function createLeadFromContact(
  contactId: string,
  body: Record<string, unknown>,
) {
  return api.post<Lead>(`leads/from-contact/${contactId}`, body);
}

export function updateLead(id: string, body: Record<string, unknown>) {
  return api.patch<Lead>(`leads/${id}`, body);
}

export function deleteLead(id: string) {
  return api.delete<void>(`leads/${id}?confirm=true`);
}

export function updateLeadStage(
  leadId: string,
  body: Record<string, unknown>,
) {
  return api.patch<Lead>(`leads/${leadId}/stage`, body);
}
