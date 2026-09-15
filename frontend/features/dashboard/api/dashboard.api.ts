import { api } from "@/lib/api/client";
import type { BusinessDashboardFeed } from "@/features/dashboard/types";

export function getBusinessDashboardFeed() {
  return api.get<BusinessDashboardFeed>("businesses/current/dashboard-feed");
}
