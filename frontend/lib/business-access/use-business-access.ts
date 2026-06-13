"use client";

import { useContext } from "react";
import { canAccessBusinessRoute } from "@/lib/capabilities/route-capability-map";
import {
  BusinessAccessCtx,
  useBusinessAccessContext,
} from "./business-access-provider";

function hasModuleKey(
  capabilityKeys: Set<string>,
  moduleKey: string,
): boolean {
  const prefix = `${moduleKey}.`;
  for (const key of capabilityKeys) {
    if (key === moduleKey || key.startsWith(prefix)) {
      return true;
    }
  }
  return false;
}

export function useBusinessAccess() {
  const ctx = useBusinessAccessContext();

  return {
    access: ctx.access,
    isLoading: ctx.isLoading,
    isError: ctx.isError,
    canAccessWorkspace: ctx.canAccessWorkspace,
    isBlocked: ctx.isBlocked,
    blockedReasonCode: ctx.blockedReasonCode,
    supportContact: ctx.supportContact,
    refetch: ctx.refetch,
    capabilityKeys: ctx.capabilityKeys,
    hasModule: (moduleKey: string) => hasModuleKey(ctx.capabilityKeys, moduleKey),
    hasCapability: (capabilityKey: string) =>
      ctx.capabilityKeys.has(capabilityKey),
    canAccessRoute: (route: string) =>
      canAccessBusinessRoute(route, ctx.capabilityKeys),
  };
}

export function useOptionalBusinessAccess() {
  const ctx = useContext(BusinessAccessCtx);
  if (!ctx) return null;

  return {
    access: ctx.access,
    isLoading: ctx.isLoading,
    isError: ctx.isError,
    canAccessWorkspace: ctx.canAccessWorkspace,
    isBlocked: ctx.isBlocked,
    blockedReasonCode: ctx.blockedReasonCode,
    supportContact: ctx.supportContact,
    refetch: ctx.refetch,
    capabilityKeys: ctx.capabilityKeys,
    hasModule: (moduleKey: string) => hasModuleKey(ctx.capabilityKeys, moduleKey),
    hasCapability: (capabilityKey: string) =>
      ctx.capabilityKeys.has(capabilityKey),
    canAccessRoute: (route: string) =>
      canAccessBusinessRoute(route, ctx.capabilityKeys),
  };
}
