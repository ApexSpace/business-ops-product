import { api } from "@/lib/api/client";
import type {
  Business,
  BusinessDashboardStats,
  BusinessMember,
  PaginatedResult,
} from "@/features/settings/types";

export function getCurrentBusiness() {
  return api.get<Business>("businesses/current");
}

export type BusinessMembersListFilters = {
  page?: number;
  limit?: number;
  search?: string;
};

export async function listBusinessMembers(
  filters: BusinessMembersListFilters = {},
): Promise<PaginatedResult<BusinessMember>> {
  const { items, meta } = await api.getPaginated<BusinessMember>(
    "businesses/current/members",
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

export function inviteBusinessMember(body: Record<string, unknown>) {
  return api.post<void>("businesses/current/members/invite", body);
}

export type CreateStaffMemberBody = {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  gender?: "FEMALE" | "MALE" | "NON_BINARY" | "PREFER_NOT_TO_SAY";
  role: "ADMIN" | "MEMBER";
  timeClockPin?: string;
  isServiceProvider?: boolean;
  canAssignProductSales?: boolean;
  sendInvite?: boolean;
};

export function createStaffMember(body: CreateStaffMemberBody) {
  return api.post<BusinessMember>("businesses/current/members", body);
}

export function resendStaffInvite(userId: string) {
  return api.post<BusinessMember & { inviteLink: string }>(
    `businesses/current/members/${userId}/resend-invite`,
  );
}

export function archiveStaffMember(userId: string) {
  return api.post<BusinessMember>(
    `businesses/current/members/${userId}/archive`,
  );
}

export function setMemberTimeClockPin(userId: string, pin: string) {
  return api.patch<{ success: true }>(
    `businesses/current/members/${userId}/time-clock-pin`,
    { pin },
  );
}

export function updateStaffMemberProfile(
  userId: string,
  body: {
    onlineBookingEnabled?: boolean;
    isServiceProvider?: boolean;
    canManageWaitlist?: boolean;
  },
) {
  return api.patch<BusinessMember>(
    `businesses/current/members/${userId}/staff-profile`,
    body,
  );
}

export function removeMemberTimeClockPin(userId: string) {
  return api.delete<{ success: true }>(
    `businesses/current/members/${userId}/time-clock-pin`,
  );
}

export function updateCurrentBusiness(body: Record<string, unknown>) {
  return api.patch<Business>("businesses/current", body);
}

export function getBusinessDashboardStats() {
  return api.get<BusinessDashboardStats>("businesses/current/dashboard-stats");
}
