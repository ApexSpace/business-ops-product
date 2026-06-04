export type AuthContextType = "platform" | "business";

export type PlatformMemberRole =
  | "SUPER_ADMIN"
  | "PLATFORM_ADMIN"
  | "SUPPORT";

export type BusinessMemberRole = "OWNER" | "ADMIN" | "MEMBER";

export interface AuthContextItem {
  type: AuthContextType;
  businessId?: string;
  businessName?: string;
  platformRole?: PlatformMemberRole;
  businessRole?: BusinessMemberRole;
  /** Opened via platform staff access (no direct membership). */
  viaPlatform?: boolean;
}

export interface AuthTokensResponse {
  accessToken: string;
  refreshToken: string;
  contexts: AuthContextItem[];
}

export interface UserMe {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  status: string;
  lastLoginAt: string | null;
  contexts: AuthContextItem[];
}

export interface JwtAccessPayload {
  sub: string;
  email: string;
  context: AuthContextType;
  platformRole?: PlatformMemberRole;
  businessId?: string;
  businessRole?: BusinessMemberRole;
}
