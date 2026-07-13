import { api } from "@/lib/api/client";
import type { BusinessMember } from "@/features/settings/types";

export type TeamMemberDetail = BusinessMember & {
  permissions: Record<string, boolean>;
  notificationSettings: Record<string, boolean>;
};

export type StaffCompensation = {
  serviceCommissionEnabled: boolean;
  serviceCommissionMode: string | null;
  serviceCommissionPercent: number | null;
  productCommissionEnabled: boolean;
  productCommissionPercent: number | null;
  productCommissionOverridesEnabled: boolean;
  hourlyEnabled: boolean;
  hourlyRate: number | null;
  greaterOfEnabled: boolean;
};

export type StaffMemberServiceItem = {
  id: string;
  name: string;
  durationMinutes: number;
  price: string | number;
  isEnabled: boolean;
  durationOverride: number | null;
  priceOverride: string | number | null;
  commissionType: string | null;
  commissionValue: string | number | null;
  onlineBookingEnabled: boolean;
  directBookingUrl: string | null;
};

export type StaffMemberServicesResponse = {
  categories: Array<{
    id: string;
    name: string;
    services: StaffMemberServiceItem[];
  }>;
};

export function getTeamMember(userId: string) {
  return api.get<TeamMemberDetail>(`businesses/current/members/${userId}`);
}

export function updateTeamMemberDetails(
  userId: string,
  body: Record<string, unknown>,
) {
  return api.patch<BusinessMember>(
    `businesses/current/members/${userId}/details`,
    body,
  );
}

export function getTeamMemberPermissions(userId: string) {
  return api.get<{ role: string; permissions: Record<string, boolean> }>(
    `businesses/current/members/${userId}/permissions`,
  );
}

export function updateTeamMemberPermissions(
  userId: string,
  permissions: Record<string, boolean>,
) {
  return api.patch<{ role: string; permissions: Record<string, boolean> }>(
    `businesses/current/members/${userId}/permissions`,
    { permissions },
  );
}

export function getTeamMemberNotifications(userId: string) {
  return api.get<{ notificationSettings: Record<string, boolean> }>(
    `businesses/current/members/${userId}/notifications`,
  );
}

export function updateTeamMemberNotifications(
  userId: string,
  notificationSettings: Record<string, boolean>,
) {
  return api.patch<{ notificationSettings: Record<string, boolean> }>(
    `businesses/current/members/${userId}/notifications`,
    { notificationSettings },
  );
}

export function getTeamMemberCompensation(userId: string) {
  return api.get<StaffCompensation>(
    `businesses/current/members/${userId}/compensation`,
  );
}

export function updateTeamMemberCompensation(
  userId: string,
  body: Partial<StaffCompensation>,
) {
  return api.patch<StaffCompensation>(
    `businesses/current/members/${userId}/compensation`,
    body,
  );
}

export function getTeamMemberServices(userId: string) {
  return api.get<StaffMemberServicesResponse>(
    `businesses/current/members/${userId}/services`,
  );
}

export function replaceTeamMemberServices(
  userId: string,
  assignments: Array<{
    serviceId: string;
    isEnabled: boolean;
    durationMinutes?: number | null;
    price?: number | null;
    commissionType?: string | null;
    commissionValue?: number | null;
    onlineBookingEnabled?: boolean;
  }>,
) {
  return api.put<StaffMemberServicesResponse>(
    `businesses/current/members/${userId}/services`,
    { assignments },
  );
}

export { resendStaffInvite } from "@/features/settings/api/business.api";
