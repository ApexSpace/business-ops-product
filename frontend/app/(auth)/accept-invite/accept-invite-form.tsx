"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormSchemaProvider,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
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
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Invalid invite</CardTitle>
          <CardDescription>
            {loadError ?? "This invite link is not valid."}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!preview) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2">
          <Skeleton className="mx-auto h-8 w-48" />
          <Skeleton className="mx-auto h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  const displayName =
    [preview.firstName, preview.lastName].filter(Boolean).join(" ") ||
    preview.email;

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Welcome!</CardTitle>
        <CardDescription>
          {preview.requiresPassword
            ? `Set your password to join ${preview.businessName}.`
            : `Activate your access to ${preview.businessName}.`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="mb-4 text-center text-sm text-muted-foreground">
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
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showPassword ? "text" : "password"}
                            autoComplete="new-password"
                            {...field}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute top-0 right-0 h-full px-3"
                            onClick={() => setShowPassword((v) => !v)}
                          >
                            {showPassword ? (
                              <EyeOff className="size-4" />
                            ) : (
                              <Eye className="size-4" />
                            )}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showConfirm ? "text" : "password"}
                            autoComplete="new-password"
                            {...field}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute top-0 right-0 h-full px-3"
                            onClick={() => setShowConfirm((v) => !v)}
                          >
                            {showConfirm ? (
                              <EyeOff className="size-4" />
                            ) : (
                              <Eye className="size-4" />
                            )}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Activating…" : "Activate account"}
                </Button>
              </form>
            </Form>
          </FormSchemaProvider>
        ) : (
          <Button
            type="button"
            className="w-full"
            disabled={loading}
            onClick={() => void completeActivation()}
          >
            {loading ? "Activating…" : "Activate account"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
