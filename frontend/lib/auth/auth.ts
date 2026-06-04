import { jwtDecode } from "jwt-decode";
import type {
  AuthContextItem,
  AuthContextType,
  JwtAccessPayload,
  PlatformMemberRole,
} from "@/lib/types/shared";

export function decodeAccessToken(token: string): JwtAccessPayload | null {
  try {
    return jwtDecode<JwtAccessPayload>(token);
  } catch {
    return null;
  }
}

export function formatRoleLabel(role: string): string {
  return role
    .split("_")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");
}

export function getContextLabel(ctx: AuthContextItem): string {
  if (ctx.type === "platform") {
    return `CodeSol Platform — ${formatRoleLabel(ctx.platformRole ?? "Member")}`;
  }
  return `${ctx.businessName ?? "Business"} — ${formatRoleLabel(ctx.businessRole ?? "Member")}`;
}

export function getContextRoleLabel(ctx: AuthContextItem): string {
  if (ctx.type === "platform") {
    return formatRoleLabel(ctx.platformRole ?? "Member");
  }
  if (ctx.viaPlatform) {
    return "Platform access";
  }
  return formatRoleLabel(ctx.businessRole ?? "Member");
}

export function getContextShortLabel(ctx: AuthContextItem): string {
  if (ctx.type === "platform") return "CodeSol Platform";
  return ctx.businessName ?? "Business";
}

export function contextKey(ctx: AuthContextItem): string {
  if (ctx.type === "platform") return "platform";
  return `business:${ctx.businessId}`;
}

export function isSameContext(
  a: AuthContextItem,
  payload: JwtAccessPayload,
): boolean {
  if (a.type === "platform" && payload.context === "platform") return true;
  if (
    a.type === "business" &&
    payload.context === "business" &&
    a.businessId === payload.businessId
  ) {
    return true;
  }
  return false;
}

export function getDashboardPath(context: AuthContextType): string {
  return context === "platform"
    ? "/platform/dashboard"
    : "/business/dashboard";
}

export function isPlatformStaffRole(role?: PlatformMemberRole): boolean {
  return (
    role === "SUPER_ADMIN" ||
    role === "PLATFORM_ADMIN" ||
    role === "SUPPORT"
  );
}

/** Minimal context list from JWT when session contexts are missing/stale. */
export function contextsFromJwt(
  jwt: JwtAccessPayload | null,
): AuthContextItem[] {
  if (!jwt) return [];
  if (jwt.context === "platform" && jwt.platformRole) {
    return [{ type: "platform", platformRole: jwt.platformRole }];
  }
  if (jwt.context === "business" && jwt.businessId) {
    return [
      {
        type: "business",
        businessId: jwt.businessId,
        businessRole: jwt.businessRole,
      },
    ];
  }
  return [];
}

export function resolveAuthContexts(
  contexts: AuthContextItem[],
  jwt: JwtAccessPayload | null,
  userContexts?: AuthContextItem[],
): AuthContextItem[] {
  if (contexts.length > 0) return contexts;
  if (userContexts && userContexts.length > 0) return userContexts;
  return contextsFromJwt(jwt);
}

export function shouldShowAccountSwitcher(
  contexts: AuthContextItem[],
  jwt: JwtAccessPayload | null,
  userContexts?: AuthContextItem[],
): boolean {
  const effective = resolveAuthContexts(contexts, jwt, userContexts);
  if (effective.length > 0) return true;
  return isPlatformStaffRole(jwt?.platformRole);
}

export function getUserDisplayName(user: {
  firstName: string | null;
  lastName: string | null;
  email: string;
}): string {
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ");
  return name || user.email;
}
