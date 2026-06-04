import { api } from "@/lib/api/client";
import type { Estimate, PaginatedResult } from "@/features/estimates/types";

export type EstimatesListFilters = {
  page?: number;
  limit?: number;
  search?: string;
  contactId?: string;
  status?: string;
  issueFrom?: string;
  issueTo?: string;
};

export async function listEstimates(
  filters: EstimatesListFilters = {},
): Promise<PaginatedResult<Estimate>> {
  const { items, meta } = await api.getPaginated<Estimate>("estimates", {
    searchParams: {
      page: filters.page,
      limit: filters.limit,
      search: filters.search,
      contactId: filters.contactId,
      status: filters.status,
      issueFrom: filters.issueFrom,
      issueTo: filters.issueTo,
    },
  });
  return { items, meta };
}

export function getEstimate(id: string) {
  return api.get<Estimate>(`estimates/${id}`);
}

export function createEstimate(body: Record<string, unknown>) {
  return api.post<Estimate>("estimates", body);
}

export function updateEstimate(id: string, body: Record<string, unknown>) {
  return api.patch<Estimate>(`estimates/${id}`, body);
}

export function deleteEstimate(id: string) {
  return api.delete<void>(`estimates/${id}?confirm=true`);
}

export function duplicateEstimate(id: string) {
  return api.post<Estimate>(`estimates/${id}/duplicate`);
}

export function updateEstimateStatus(
  id: string,
  status: Estimate["status"],
) {
  return api.patch<Estimate>(`estimates/${id}/status`, { status });
}
