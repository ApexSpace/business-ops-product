import { api } from "@/lib/api/client";
import type {
  AvailableMembershipForService,
  ClientMembershipDetail,
  ClientMembershipListItem,
  ClientMembershipsListFilters,
  CreateClientMembershipInput,
  CreateMembershipPlanInput,
  MembershipPlan,
  MembershipSettings,
  ServiceGroupItemInput,
  UpdateClientMembershipInput,
  UpdatePlanDetailsInput,
} from "@/features/memberships/types";

export function listMembershipPlans(includeArchived = false) {
  return api.get<MembershipPlan[]>("memberships/plans", {
    searchParams: includeArchived ? { includeArchived: "true" } : undefined,
  });
}

export function getMembershipPlan(id: string) {
  return api.get<MembershipPlan>(`memberships/plans/${id}`);
}

export function createMembershipPlan(body: CreateMembershipPlanInput) {
  return api.post<MembershipPlan>("memberships/plans", body);
}

export function updateMembershipPlanDetails(
  id: string,
  body: UpdatePlanDetailsInput,
) {
  return api.patch<MembershipPlan>(`memberships/plans/${id}/details`, body);
}

export function updateMembershipServiceGroups(
  id: string,
  groups: ServiceGroupItemInput[],
) {
  return api.patch<MembershipPlan>(`memberships/plans/${id}/service-groups`, {
    groups,
  });
}

export function updateMembershipDiscounts(
  id: string,
  body: { productDiscountPercent: number; serviceDiscountPercent: number },
) {
  return api.patch<MembershipPlan>(`memberships/plans/${id}/discounts`, body);
}

export function updateMembershipAgreement(
  id: string,
  body: { requireAgreement: boolean; agreementText?: string },
) {
  return api.patch<MembershipPlan>(`memberships/plans/${id}/agreement`, body);
}

export function updateMembershipPlanOnlineSales(
  id: string,
  body: {
    availableOnline: boolean;
    shortDescription?: string;
    description?: string;
  },
) {
  return api.patch<MembershipPlan>(
    `memberships/plans/${id}/online-sales`,
    body,
  );
}

export function updateMembershipAdvanced(
  id: string,
  body: { commissionBasis: "REGULAR_PRICE" | "DISCOUNTED_PRICE" },
) {
  return api.patch<MembershipPlan>(`memberships/plans/${id}/advanced`, body);
}

export function duplicateMembershipPlan(id: string) {
  return api.post<MembershipPlan>(`memberships/plans/${id}/duplicate`);
}

export function archiveMembershipPlan(id: string) {
  return api.post(`memberships/plans/${id}/archive`);
}

export function reorderMembershipPlans(ids: string[]) {
  return api.post("memberships/plans/reorder", { ids });
}

export function listClientMemberships(
  filters: ClientMembershipsListFilters = {},
) {
  return api.getPaginated<ClientMembershipListItem>(
    "memberships/client-memberships",
    {
      searchParams: filters as Record<
        string,
        string | number | boolean | undefined | null
      >,
    },
  );
}

export function getClientMembership(id: string) {
  return api.get<ClientMembershipDetail>(
    `memberships/client-memberships/${id}`,
  );
}

export function createClientMembership(body: CreateClientMembershipInput) {
  return api.post<ClientMembershipDetail>(
    "memberships/client-memberships",
    body,
  );
}

export function updateClientMembership(
  id: string,
  body: UpdateClientMembershipInput,
) {
  return api.patch<ClientMembershipDetail>(
    `memberships/client-memberships/${id}`,
    body,
  );
}

export async function exportClientMemberships(
  filters: ClientMembershipsListFilters = {},
): Promise<Blob> {
  const url = new URL(
    "/api/backend/memberships/client-memberships/export",
    window.location.origin,
  );
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }
  const res = await fetch(url.toString(), { credentials: "include" });
  if (!res.ok) throw new Error("Export failed");
  return res.blob();
}

export function getMembershipSettings() {
  return api.get<MembershipSettings>("memberships/settings");
}

export function updateMembershipPreferences(body: {
  allowClientCancel: boolean;
}) {
  return api.patch<MembershipSettings>(
    "memberships/settings/preferences",
    body,
  );
}

export function updateMembershipSettingsOnlineSales(body: {
  onlineSalesEnabled: boolean;
}) {
  return api.patch<MembershipSettings>(
    "memberships/settings/online-sales",
    body,
  );
}

export function getPublicMembershipCatalog(slug: string) {
  return api.get<{
    business: { id: string; name: string };
    plans: Array<{
      id: string;
      name: string;
      emoji: string | null;
      price: string;
      billingIntervalUnit: string;
      shortDescription: string | null;
    }>;
    stripeReady: boolean;
  }>(`public/memberships/${slug}`);
}

export function getPublicMembershipPlan(slug: string, planId: string) {
  return api.get<{
    business: { id: string; name: string };
    plan: MembershipPlan;
    stripeReady: boolean;
  }>(`public/memberships/${slug}/plans/${planId}`);
}

export function initiateMembershipCheckout(
  slug: string,
  planId: string,
  body: {
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
    agreementAccepted?: boolean;
  },
) {
  return api.post<{ url: string }>(
    `public/memberships/${slug}/plans/${planId}/checkout`,
    body,
  );
}

export function listAvailableMembershipsForService(
  contactId: string,
  serviceId: string,
) {
  return api.get<AvailableMembershipForService[]>(
    "memberships/client-memberships/available-for-service",
    { searchParams: { contactId, serviceId } },
  );
}

export const initiatePublicMembershipCheckout = initiateMembershipCheckout;
