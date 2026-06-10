import { api } from "@/lib/api/client";
import type { BusinessTenantAccess } from "./types";

export function getCurrentBusinessAccess() {
  return api.get<BusinessTenantAccess>("businesses/current/access");
}
