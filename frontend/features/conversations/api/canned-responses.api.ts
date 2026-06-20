import { api } from "@/lib/api/client";

export interface CannedResponse {
  id: string;
  title: string;
  body: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export function listCannedResponses() {
  return api.get<CannedResponse[]>("canned-responses");
}

export function createCannedResponse(body: {
  title: string;
  body: string;
  sortOrder?: number;
}) {
  return api.post<CannedResponse>("canned-responses", body);
}

export function updateCannedResponse(
  id: string,
  body: Partial<{ title: string; body: string; sortOrder: number }>,
) {
  return api.patch<CannedResponse>(`canned-responses/${id}`, body);
}

export function deleteCannedResponse(id: string) {
  return api.delete<void>(`canned-responses/${id}?confirm=true`);
}
