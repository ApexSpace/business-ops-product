export const ACCESS_TOKEN_COOKIE = "access_token";
export const REFRESH_TOKEN_COOKIE = "refresh_token";
export const CONTEXTS_COOKIE = "auth_contexts";

/** Must match backend JWT_ACCESS_EXPIRES_IN (default 24h). */
export const ACCESS_MAX_AGE = 60 * 60 * 24;
export const REFRESH_MAX_AGE = 60 * 60 * 24 * 7;
