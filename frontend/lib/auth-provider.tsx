"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { useNavigationLoading } from "@/lib/navigation-loading";
import type {
  AuthContextItem,
  AuthTokensResponse,
  JwtAccessPayload,
  UserMe,
} from "@/types/api";

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
  const res = await fetch("/api/auth/session", {
    credentials: "include",
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) return null;
  return res.json() as Promise<SessionResponse>;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const { start, stop } = useNavigationLoading();

  const { data: session, isLoading, refetch } = useQuery({
    queryKey: queryKeys.auth.session(),
    queryFn: fetchSession,
    retry: false,
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

  const value = useMemo(
    () => ({
      user: session?.user ?? null,
      contexts: session?.contexts ?? session?.user?.contexts ?? [],
      jwt: session?.jwt ?? null,
      isLoading,
      isAuthenticated: !!session?.authenticated,
      login,
      logout,
      switchContext,
      refreshSession: async () => {
        await refetch();
      },
    }),
    [session, isLoading, login, logout, switchContext, refetch],
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
