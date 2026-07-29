import { api } from "@/lib/api/client";

export type ServiceCategory = {
  id: string;
  businessId: string;
  name: string;
  description: string | null;
  sortOrder: number;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export function listServiceCategories() {
  return api.get<ServiceCategory[]>("service-categories");
}

export function createServiceCategory(body: { name: string; description?: string }) {
  return api.post<ServiceCategory>("service-categories", body);
}

export function updateServiceCategory(
  id: string,
  body: Record<string, unknown>,
) {
  return api.patch<ServiceCategory>(`service-categories/${id}`, body);
}

export function deleteServiceCategory(id: string) {
  return api.delete<void>(`service-categories/${id}?confirm=true`);
}

export function reorderServiceCategories(orderedIds: string[]) {
  return api.post<ServiceCategory[]>("service-categories/reorder", {
    orderedIds,
  });
}
