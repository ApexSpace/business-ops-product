"use client";

import { useAuth } from "@/lib/auth/provider";
import {
  evaluatePermission,
  type Permission,
} from "@/features/auth/permissions/permissions";

export function useCan(permission: Permission): boolean {
  const { jwt, contexts } = useAuth();
  return evaluatePermission(permission, jwt, contexts);
}
