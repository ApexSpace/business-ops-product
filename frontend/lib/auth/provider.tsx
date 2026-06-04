"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { resolveAuthContexts } from "./auth";
import { ApiClientError } from "@/lib/api/errors";
import { queryKeys } from "@/lib/query/keys";
import { useNavigationLoading } from "@/lib/runtime/navigation-loading";
import type {
  AuthContextItem,
  AuthTokensResponse,
  JwtAccessPayload,
  UserMe,
} from "@/lib/types/shared";

interface SessionResponse {
  authenticated: boolean;
  jwt: JwtAccessPayload | null;
  user: UserMe;
  contexts: AuthContextItem[];
}

interface AuthContextValue {
  user: UserMe | null;
  contexts: AuthContextItem[];
  jwt: JwtAccessPayload | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  sessionError: unknown;
  login: (email: string, password: string) => Promise<AuthTokensResponse>;
  logout: () => Promise<void>;
  switchContext: (
    type: "platform" | "business",
    businessId?: string,
  ) => Promise<AuthTokensResponse>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function fetchSession(): Promise<SessionResponse | null> {
  try {
    const res = await fetch("/api/auth/session", {
      credentials: "include",
      signal: AbortSignal.timeout(35_000),
    });
    if (res.status === 401) {
      return null;
    }
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new ApiClientError(
        typeof body.message === "string"
          ? body.message
          : res.status >= 500
            ? "Unable to load your session. The server may be unavailable."
            : "Session unavailable",
        res.status,
        { code: typeof body.code === "string" ? body.code : undefined },
      );
    }
    return body as SessionResponse;
  } catch (err) {
    if (err instanceof ApiClientError) throw err;
    if (err instanceof Error && err.name === "TimeoutError") {
      throw new ApiClientError(
        "The server took too long to respond.",
        504,
        { code: "SERVICE_TIMEOUT" },
      );
    }
    throw new ApiClientError(
      "Could not reach the application server.",
      503,
      { code: "BACKEND_UNAVAILABLE" },
    );
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const { start, stop } = useNavigationLoading();

  const { data: session, isLoading, error: sessionError, refetch } = useQuery({
    queryKey: queryKeys.auth.session(),
    queryFn: fetchSession,
    retry: (failureCount, error) => {
      if (error instanceof ApiClientError && error.status >= 500) {
        return failureCount < 1;
      }
      return false;
    },
    staleTime: 60_000,
  });

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        credentials: "include",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json.message ?? "Login failed");
      }
      const tokens = json.data as AuthTokensResponse;
      await refetch();
      return tokens;
    },
    [refetch],
  );

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });
    queryClient.setQueryData(queryKeys.auth.session(), null);
    queryClient.clear();
  }, [queryClient]);

  const switchContext = useCallback(
    async (type: "platform" | "business", businessId?: string) => {
      start();
      try {
        const res = await fetch("/api/auth/switch-context", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type, businessId }),
          credentials: "include",
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(json.message ?? "Failed to switch context");
        }
        const tokens = json.data as AuthTokensResponse;
        await refetch();
        return tokens;
      } catch (error) {
        stop();
        throw error;
      }
    },
    [refetch, start, stop],
  );

  const value = useMemo(() => {
    const user = session?.user ?? null;
    const jwt = session?.jwt ?? null;
    const rawContexts = session?.contexts ?? user?.contexts ?? [];
    const contexts = resolveAuthContexts(rawContexts, jwt, user?.contexts);

    return {
      user,
      contexts,
      jwt,
      isLoading,
      isAuthenticated: !!session?.authenticated,
      sessionError: sessionError ?? null,
      login,
      logout,
      switchContext,
      refreshSession: async () => {
        await refetch();
      },
    };
  }, [session, isLoading, sessionError, login, logout, switchContext, refetch]);

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
