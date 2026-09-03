import { api } from "@/lib/api/client";
import type { Service } from "@/features/services/types";

export type ServiceTreeItem = {
  id: string;
  name: string;
  status: string;
  isDemo: boolean;
  sortOrder: number;
};

export type ServiceTreeCategory = {
  id: string;
  name: string;
  sortOrder: number;
  services: ServiceTreeItem[];
};

export type ServiceStaffAssignment = {
  id: string;
  userId: string;
  user: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
  };
  isEnabled: boolean;
  durationMinutes: number | null;
  price: string | null;
  commissionType: "FLAT" | "PERCENT" | null;
  commissionValue: string | null;
  onlineBookingEnabled: boolean;
  sortOrder: number;
};

export type ServiceOnlineBookingSettings = {
  onlineBookingEnabled: boolean;
  calendarId: string | null;
  customizePriceDisplay: boolean;
  priceDisplayMode: "SHOW_MINIMUM" | "HIDE" | null;
  showPromptToCall: boolean;
  promptToCallExplanation: string | null;
  onlineBookingDescription: string | null;
  requireHomeAddress: boolean;
  requireCreditCard: boolean;
  requirePaymentAtBooking: "NO" | "OPTIONAL" | "REQUIRED";
};

export type ServiceResourceRequirement = {
  id: string;
  groupId: string | null;
  groupName: string | null;
  selectionMode: "ALL" | "SPECIFIC";
  resourceIds: string[];
  resources: Array<{ id: string; name: string }>;
  sortOrder: number;
};

export type ServiceWorkspace = {
  service: Service;
  timing: {
    clientOccupancyMinutes: number;
    staffBlockedMinutes: number;
    segments: Array<{ type: string; minutes: number }>;
  };
  staffingMode: string;
  staff: ServiceStaffAssignment[];
  onlineBooking: ServiceOnlineBookingSettings | null;
  resourceRequirements: ServiceResourceRequirement[];
  products: Array<Record<string, unknown>>;
  productsCostTotal: string;
  optionGroups: Array<{
    id: string;
    name: string;
    description: string | null;
    required: boolean;
    minSelections: number;
    maxSelections: number | null;
    sortOrder: number;
    options: Array<{
      id: string;
      name: string;
      priceAdjustment: string;
      durationAdjustmentMinutes: number;
      isActive: boolean;
      sortOrder: number;
    }>;
  }>;
};

export function getServicesTree() {
  return api.get<{ categories: ServiceTreeCategory[] }>("services/tree");
}

export function getServiceWorkspace(serviceId: string) {
  return api.get<ServiceWorkspace>(`services/${serviceId}/workspace`);
}

export function patchServiceDetails(
  serviceId: string,
  body: Record<string, unknown>,
) {
  return api.patch<Service>(`services/${serviceId}/details`, body);
}

export function replaceServiceStaff(
  serviceId: string,
  staff: Record<string, unknown>[],
) {
  return api.put<{ staff: unknown[] }>(`services/${serviceId}/staff`, { staff });
}

export function patchServiceOnlineBooking(
  serviceId: string,
  body: Record<string, unknown>,
) {
  return api.patch<{ settings: ServiceOnlineBookingSettings }>(
    `services/${serviceId}/online-booking`,
    body,
  );
}

export function getServiceDirectLinks(serviceId: string) {
  return api.get<{
    serviceLink: string | null;
    staffLinks: Array<{ userId: string; url: string }>;
    hint: string | null;
  }>(`services/${serviceId}/online-booking/direct-link`);
}

export function createResourceRequirement(
  serviceId: string,
  body: {
    groupId: string;
    selectionMode: "ALL" | "SPECIFIC";
    resourceIds?: string[];
  },
) {
  return api.post<ServiceResourceRequirement>(
    `services/${serviceId}/resource-requirements`,
    body,
  );
}

export function updateResourceRequirement(
  serviceId: string,
  reqId: string,
  body: {
    groupId?: string;
    selectionMode?: "ALL" | "SPECIFIC";
    resourceIds?: string[];
  },
) {
  return api.patch<ServiceResourceRequirement>(
    `services/${serviceId}/resource-requirements/${reqId}`,
    body,
  );
}

export function deleteResourceRequirement(serviceId: string, reqId: string) {
  return api.delete(`services/${serviceId}/resource-requirements/${reqId}`);
}

export function replaceServiceProducts(
  serviceId: string,
  products: Record<string, unknown>[],
) {
  return api.put(`services/${serviceId}/products`, { products });
}

export function createOptionGroup(
  serviceId: string,
  body: Record<string, unknown>,
) {
  return api.post(`services/${serviceId}/option-groups`, body);
}

export function deleteOptionGroup(serviceId: string, groupId: string) {
  return api.delete(`services/${serviceId}/option-groups/${groupId}`);
}

export function createServiceOption(
  serviceId: string,
  groupId: string,
  body: Record<string, unknown>,
) {
  return api.post(`services/${serviceId}/option-groups/${groupId}/options`, body);
}

export function deleteServiceOption(
  serviceId: string,
  groupId: string,
  optionId: string,
) {
  return api.delete(
    `services/${serviceId}/option-groups/${groupId}/options/${optionId}`,
  );
}
