"use client";

import { useState } from "react";
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
import { Input } from "@/components/ui/input";
import { AuthCallout } from "@/features/auth/components/auth-callout";
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
import { useAuth } from "@/lib/auth/provider";
import { useNavigationLoading } from "@/lib/runtime/navigation-loading";
import { useAppRouter } from "@/lib/hooks/use-app-router";
import { resolvePostLoginPath, needsContextSelection } from "@/lib/runtime/routing";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const router = useAppRouter();
  const searchParams = useSearchParams();
  const { login, refreshSession } = useAuth();
  const { start, stop } = useNavigationLoading();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const errorParam = searchParams.get("error");
  const reasonParam = searchParams.get("reason");

  const onSubmit = async (values: LoginFormValues) => {
    setLoading(true);
    start();
    try {
      const tokens = await login(values.email, values.password);
      await refreshSession();

      if (needsContextSelection(tokens.contexts)) {
        router.push("/select-context");
      } else {
        router.push(resolvePostLoginPath(tokens));
      }
      router.refresh();
    } catch (err) {
      stop();
      toast.error(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthPanel>
      <h1 className="sr-only">Sign in</h1>
      {reasonParam === "subscription-canceled" ? (
        <AuthCallout tone="warning">
          Your subscription was canceled and your workspace access has been
          removed. Sign in again to open another workspace.
        </AuthCallout>
      ) : null}
      {reasonParam === "trial-handoff-expired" ? (
        <AuthCallout tone="warning">
          Your signup handoff expired. If you just created an account, sign in
          with the email and password you set.
        </AuthCallout>
      ) : null}
      {errorParam === "no_access" ? (
        <AuthCallout tone="error">
          Your account has no active platform or business access.
        </AuthCallout>
      ) : null}
      <Form {...form}>
        <FormSchemaProvider schema={loginSchema}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className={AUTH_FORM_STACK_CLASS}
          >
            <AuthFieldGroup>
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem className={AUTH_FIELD_ROW_CLASS}>
                    <FormLabel className="sr-only">Email address</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        autoComplete="email"
                        placeholder="Email address"
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
                name="password"
                render={({ field }) => (
                  <FormItem className={AUTH_FIELD_ROW_CLASS}>
                    <FormLabel className="sr-only">Password</FormLabel>
                    <FormControl>
                      <AuthPasswordInput
                        visible={showPassword}
                        onToggleVisibility={() => setShowPassword((v) => !v)}
                        autoComplete="current-password"
                        placeholder="Password"
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
              {loading ? "Signing in…" : "Sign in"}
            </Button>
            <p className="text-center">
              <AuthTextLink
                href="/forgot-password"
                className={AUTH_FOOTER_LINK_CLASS}
              >
                Forgot password?
              </AuthTextLink>
            </p>
          </form>
        </FormSchemaProvider>
      </Form>
    </AuthPanel>
  );
}
