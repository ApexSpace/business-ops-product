/**
 * Cross-cutting DTOs shared across features.
 * Prefer `features/<domain>/types` for domain-specific imports.
 */
export type {
  AuthContextItem,
  AuthContextType,
  AuthTokensResponse,
  BusinessMemberRole,
  JwtAccessPayload,
  PlatformMemberRole,
  UserMe,
} from "@/features/auth/types/auth-dto";

export type {
  ApiErrorBody,
  Business,
  BusinessDashboardStats,
  BusinessMember,
  BusinessStatus,
  Industry,
  IndustryLabels,
  IndustryOption,
  MemberUser,
  PaginatedMeta,
  PaginatedResult,
} from "./api";
