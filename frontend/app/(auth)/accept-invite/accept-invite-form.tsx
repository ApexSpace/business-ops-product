"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormSchemaProvider,
} from "@/components/ui/form";
import { AuthFieldGroup } from "@/features/auth/components/auth-field-group";
import {
  AuthPanel,
  AuthPanelSkeleton,
} from "@/features/auth/components/auth-panel";
import { AuthPasswordInput } from "@/features/auth/components/auth-password-input";
import {
  AUTH_FIELD_INPUT_CLASS,
  AUTH_FIELD_ROW_CLASS,
  AUTH_FORM_STACK_CLASS,
} from "@/lib/design/auth-tokens";
import { useAuth } from "@/lib/auth/provider";
import { useNavigationLoading } from "@/lib/runtime/navigation-loading";
import { useAppRouter } from "@/lib/hooks/use-app-router";
import {
  needsContextSelection,
  resolvePostLoginPath,
} from "@/lib/runtime/routing";
import type { InvitePreview } from "@/app/api/auth/invite-preview/route";
import type { AuthTokensResponse } from "@/lib/types/shared";

const passwordSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(8),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type PasswordFormValues = z.infer<typeof passwordSchema>;

async function fetchInvitePreview(token: string): Promise<InvitePreview> {
  const res = await fetch(
    `/api/auth/invite-preview?token=${encodeURIComponent(token)}`,
  );
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      typeof json.message === "string"
        ? json.message
        : "Invalid or expired invite",
    );
  }
  return json.data as InvitePreview;
}

async function acceptInviteRequest(
  token: string,
  password?: string,
): Promise<AuthTokensResponse> {
  const res = await fetch("/api/auth/accept-invite", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ token, password }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      typeof json.message === "string"
        ? json.message
        : "Could not activate account",
    );
  }
  return json.data as AuthTokensResponse;
}

export function AcceptInviteForm() {
  const router = useAppRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const { refreshSession } = useAuth();
  const { start, stop } = useNavigationLoading();
  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const form = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  useEffect(() => {
    if (!token) {
      setLoadError("This invite link is missing a token.");
      return;
    }
    let cancelled = false;
    void fetchInvitePreview(token)
      .then((data) => {
        if (!cancelled) setPreview(data);
      })
      .catch((err: Error) => {
        if (!cancelled) setLoadError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const completeActivation = async (password?: string) => {
    setLoading(true);
    start();
    try {
      const tokens = await acceptInviteRequest(token, password);
      await refreshSession();
      if (needsContextSelection(tokens.contexts)) {
        router.push("/select-context");
      } else {
        router.push(resolvePostLoginPath(tokens));
      }
      router.refresh();
    } catch (err) {
      stop();
      toast.error(
        err instanceof Error ? err.message : "Could not activate account",
      );
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (values: PasswordFormValues) => {
    await completeActivation(values.password);
  };

  if (!token || loadError) {
    return (
      <AuthPanel
        title="Invalid invite"
        description={loadError ?? "This invite link is not valid."}
      />
    );
  }

  if (!preview) {
    return <AuthPanelSkeleton />;
  }

  const displayName =
    [preview.firstName, preview.lastName].filter(Boolean).join(" ") ||
    preview.email;

  return (
    <AuthPanel
      title="Welcome"
      description={
        preview.requiresPassword
          ? `Set your password to join ${preview.businessName}.`
          : `Activate your access to ${preview.businessName}.`
      }
    >
      <p className="mb-[var(--spacing-4)] text-center text-body-small text-muted-foreground">
        Hi {displayName}, you were invited
        {preview.inviterName ? ` by ${preview.inviterName}` : ""} to join{" "}
        <span className="font-medium text-foreground">
          {preview.businessName}
        </span>
        .
      </p>

      {preview.requiresPassword ? (
        <FormSchemaProvider schema={passwordSchema}>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className={AUTH_FORM_STACK_CLASS}
            >
              <AuthFieldGroup>
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem className={AUTH_FIELD_ROW_CLASS}>
                      <FormLabel className="sr-only">Password</FormLabel>
                      <FormControl>
                        <AuthPasswordInput
                          visible={showPassword}
                          onToggleVisibility={() => setShowPassword((v) => !v)}
                          autoComplete="new-password"
                          placeholder="Password"
                          className={AUTH_FIELD_INPUT_CLASS}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem className={AUTH_FIELD_ROW_CLASS}>
                      <FormLabel className="sr-only">Confirm password</FormLabel>
                      <FormControl>
                        <AuthPasswordInput
                          visible={showConfirm}
                          onToggleVisibility={() => setShowConfirm((v) => !v)}
                          autoComplete="new-password"
                          placeholder="Confirm password"
                          className={AUTH_FIELD_INPUT_CLASS}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </AuthFieldGroup>
              <Button
                type="submit"
                variant="brand"
                className="w-full"
                disabled={loading}
                aria-busy={loading}
              >
                {loading ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : null}
                {loading ? "Activating…" : "Activate account"}
              </Button>
            </form>
          </Form>
        </FormSchemaProvider>
      ) : (
        <Button
          type="button"
          variant="brand"
          className="w-full"
          disabled={loading}
          aria-busy={loading}
          onClick={() => void completeActivation()}
        >
          {loading ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : null}
          {loading ? "Activating…" : "Activate account"}
        </Button>
      )}
    </AuthPanel>
  );
}
