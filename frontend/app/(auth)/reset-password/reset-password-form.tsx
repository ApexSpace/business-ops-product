"use client";

import { useState } from "react";
import Link from "next/link";
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
import { AuthPanel } from "@/features/auth/components/auth-panel";
import { AuthPasswordInput } from "@/features/auth/components/auth-password-input";
import { AuthTextLink } from "@/features/auth/components/auth-text-link";
import {
  AUTH_FIELD_INPUT_CLASS,
  AUTH_FIELD_ROW_CLASS,
  AUTH_FOOTER_LINK_CLASS,
  AUTH_FORM_STACK_CLASS,
} from "@/lib/design/auth-tokens";

const resetPasswordSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(8),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

async function resetPasswordRequest(
  token: string,
  password: string,
): Promise<void> {
  const res = await fetch("/api/auth/reset-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, password }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      typeof json.message === "string"
        ? json.message
        : "Could not reset password",
    );
  }
}

export function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  const onSubmit = async (values: ResetPasswordFormValues) => {
    setLoading(true);
    try {
      await resetPasswordRequest(token, values.password);
      setSuccess(true);
      toast.success("Password updated. You can sign in now.");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not reset password",
      );
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <AuthPanel
        title="Invalid reset link"
        description="This password reset link is missing a token. Request a new link to continue."
      >
        <Button
          variant="brand"
          className="w-full"
          nativeButton={false}
          render={<Link href="/forgot-password" />}
        >
          Request a new link
        </Button>
      </AuthPanel>
    );
  }

  if (success) {
    return (
      <AuthPanel
        title="Password updated"
        description="Your password was changed successfully. Sign in with your new password."
      >
        <Button
          variant="brand"
          className="w-full"
          nativeButton={false}
          render={<Link href="/login" />}
        >
          Sign in
        </Button>
      </AuthPanel>
    );
  }

  return (
    <AuthPanel
      title="Set a new password"
      description="Choose a new password for your account. This link can only be used once."
    >
      <Form {...form}>
        <FormSchemaProvider schema={resetPasswordSchema}>
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
                    <FormLabel className="sr-only">New password</FormLabel>
                    <FormControl>
                      <AuthPasswordInput
                        visible={showPassword}
                        onToggleVisibility={() => setShowPassword((v) => !v)}
                        autoComplete="new-password"
                        placeholder="New password"
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
              {loading ? "Updating…" : "Update password"}
            </Button>
            <p className="text-center">
              <AuthTextLink
                href="/forgot-password"
                className={AUTH_FOOTER_LINK_CLASS}
              >
                Request a new link
              </AuthTextLink>
            </p>
          </form>
        </FormSchemaProvider>
      </Form>
    </AuthPanel>
  );
}
