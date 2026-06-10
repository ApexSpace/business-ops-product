import { api } from "@/lib/api/client";
import type {
  AuditLog,
  Business,
  Industry,
  PaginatedResult,
  PlatformBusinessUtilization,
  PlatformDashboardStats,
  PlatformSettings,
  PlatformUser,
} from "@/features/platform/types";

export type PlatformBusinessesListFilters = {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  subscriptionStatus?: string;
  paymentStatus?: string;
  planGroupId?: string;
  planTierId?: string;
  canAccess?: boolean;
  needsAttention?: string;
};

export async function listPlatformBusinesses(
  filters: PlatformBusinessesListFilters = {},
): Promise<PaginatedResult<Business>> {
  const { items, meta } = await api.getPaginated<Business>(
    "platform/businesses",
    {
      searchParams: {
        page: filters.page,
        limit: filters.limit,
        search: filters.search,
        status: filters.status,
        subscriptionStatus: filters.subscriptionStatus,
        paymentStatus: filters.paymentStatus,
        planGroupId: filters.planGroupId,
        planTierId: filters.planTierId,
        canAccess:
          filters.canAccess === undefined
            ? undefined
            : filters.canAccess
              ? "true"
              : "false",
        needsAttention: filters.needsAttention,
      },
    },
  );
  return { items, meta };
}

export function getPlatformBusiness(id: string) {
  return api.get<Business>(`platform/businesses/${id}`);
}

export function getPlatformBusinessUtilization(id: string) {
  return api.get<PlatformBusinessUtilization>(
    `platform/businesses/${id}/utilization`,
  );
}

export function applyPlatformBusinessSnapshot(
  businessId: string,
  body: { snapshotId: string },
) {
  return api.post<Business>(
    `platform/businesses/${businessId}/apply-snapshot`,
    body,
  );
}

export function deletePlatformBusiness(id: string) {
  return api.delete<void>(`platform/businesses/${id}?confirm=true`);
}

export type PlatformUsersListFilters = {
  page?: number;
  limit?: number;
  role?: string;
};

export async function listPlatformUsers(
  filters: PlatformUsersListFilters = {},
): Promise<PaginatedResult<PlatformUser>> {
  const { items, meta } = await api.getPaginated<PlatformUser>(
    "platform/users",
    {
      searchParams: {
        page: filters.page,
        limit: filters.limit,
        role: filters.role,
      },
    },
  );
  return { items, meta };
}

export function deletePlatformUser(id: string) {
  return api.delete<void>(`platform/users/${id}?confirm=true`);
}

export type PlatformIndustriesListFilters = {
  page?: number;
  limit?: number;
  status?: string;
};

export async function listPlatformIndustries(
  filters: PlatformIndustriesListFilters = {},
): Promise<PaginatedResult<Industry>> {
  const { items, meta } = await api.getPaginated<Industry>(
    "platform/industries",
    {
      searchParams: {
        page: filters.page,
        limit: filters.limit,
        status: filters.status,
      },
    },
  );
  return { items, meta };
}

export function deletePlatformIndustry(id: string) {
  return api.delete<void>(`platform/industries/${id}?confirm=true`);
}

export type PlatformAuditLogsListFilters = {
  page?: number;
  limit?: number;
  search?: string;
};

export async function listPlatformAuditLogs(
  filters: PlatformAuditLogsListFilters = {},
): Promise<PaginatedResult<AuditLog>> {
  const { items, meta } = await api.getPaginated<AuditLog>(
    "platform/audit-logs",
    {
      searchParams: {
        page: filters.page,
        limit: filters.limit,
        search: filters.search,
      },
    },
  );
  return { items, meta };
}

export async function listBusinessAuditLogs(
  businessId: string,
  filters: { page?: number; limit?: number; action?: string } = {},
): Promise<PaginatedResult<AuditLog>> {
  const { items, meta } = await api.getPaginated<AuditLog>(
    `platform/businesses/${businessId}/audit-logs`,
    {
      searchParams: {
        page: filters.page,
        limit: filters.limit,
        action: filters.action,
      },
    },
  );
  return { items, meta };
}

export function createPlatformBusiness(body: Record<string, unknown>) {
  return api.post<Business>("platform/businesses", body);
}

export function updatePlatformBusiness(
  id: string,
  body: Record<string, unknown>,
) {
  return api.patch<Business>(`platform/businesses/${id}`, body);
}

export function getPlatformBusinessMembers(id: string) {
  return api.get<import("@/features/platform/types").BusinessMember[]>(
    `platform/businesses/${id}/members`,
  );
}

export function invitePlatformBusinessMember(
  businessId: string,
  body: Record<string, unknown>,
) {
  return api.post<import("@/features/platform/types").BusinessMember>(
    `platform/businesses/${businessId}/members/invite`,
    body,
  );
}

export function setPlatformBusinessOwner(
  businessId: string,
  body: Record<string, unknown>,
) {
  return api.post<import("@/features/platform/types").BusinessMember>(
    `platform/businesses/${businessId}/members/owner`,
    body,
  );
}

export function createPlatformUser(body: Record<string, unknown>) {
  return api.post<PlatformUser>("platform/users", body);
}

export function updatePlatformUser(id: string, body: Record<string, unknown>) {
  return api.patch<PlatformUser>(`platform/users/${id}`, body);
}

export function createPlatformIndustry(body: Record<string, unknown>) {
  return api.post<Industry>("platform/industries", body);
}

export function updatePlatformIndustry(
  id: string,
  body: Record<string, unknown>,
) {
  return api.patch<Industry>(`platform/industries/${id}`, body);
}

export type IndustryOption = { id: string; name: string; slug: string };

export function listActiveIndustries() {
  return api.get<IndustryOption[]>("industries/active");
}

export function getPlatformSettings() {
  return api.get<PlatformSettings>("platform/settings");
}

export function updatePlatformSettings(body: Record<string, unknown>) {
  return api.patch<PlatformSettings>("platform/settings", body);
}

export function getPlatformDashboardStats() {
  return api.get<PlatformDashboardStats>("platform/dashboard/stats");
}
