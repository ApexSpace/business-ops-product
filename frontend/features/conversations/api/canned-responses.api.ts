import { api } from "@/lib/api/client";

const DEFAULT_API_BASE = "canned-responses";

function path(apiBase: string, ...segments: string[]) {
  return [apiBase, ...segments].filter(Boolean).join("/");
}

export interface CannedResponse {
  id: string;
  title: string;
  body: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export function listCannedResponses(apiBase: string = DEFAULT_API_BASE) {
  return api.get<CannedResponse[]>(apiBase);
}

export function createCannedResponse(
  body: {
    title: string;
    body: string;
    sortOrder?: number;
  },
  apiBase: string = DEFAULT_API_BASE,
) {
  return api.post<CannedResponse>(apiBase, body);
}

export function updateCannedResponse(
  id: string,
  body: Partial<{ title: string; body: string; sortOrder: number }>,
  apiBase: string = DEFAULT_API_BASE,
) {
  return api.patch<CannedResponse>(path(apiBase, id), body);
}

export function deleteCannedResponse(
  id: string,
  apiBase: string = DEFAULT_API_BASE,
) {
  return api.delete<void>(`${path(apiBase, id)}?confirm=true`);
}
