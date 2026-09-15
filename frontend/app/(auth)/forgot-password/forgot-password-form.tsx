"use client";

import { useState } from "react";
import Link from "next/link";
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
import { AuthFieldGroup } from "@/features/auth/components/auth-field-group";
import { AuthPanel } from "@/features/auth/components/auth-panel";
import { AuthTextLink } from "@/features/auth/components/auth-text-link";
import {
  AUTH_FIELD_INPUT_CLASS,
  AUTH_FIELD_ROW_CLASS,
  AUTH_FOOTER_LINK_CLASS,
  AUTH_FORM_STACK_CLASS,
} from "@/lib/design/auth-tokens";

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

async function requestPasswordReset(email: string): Promise<void> {
  const res = await fetch("/api/auth/forgot-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      typeof json.message === "string"
        ? json.message
        : "Could not send password reset email",
    );
  }
}

export function ForgotPasswordForm() {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (values: ForgotPasswordFormValues) => {
    setLoading(true);
    try {
      await requestPasswordReset(values.email);
      setSubmitted(true);
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Could not send password reset email",
      );
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <AuthPanel
        title="Check your email"
        description="If an account exists for that email, we sent a password reset link. The link expires in 1 hour."
      >
        <Button
          variant="outline"
          className="w-full"
          nativeButton={false}
          render={<Link href="/login" />}
        >
          Back to sign in
        </Button>
      </AuthPanel>
    );
  }

  return (
    <AuthPanel
      title="Forgot password"
      description="Enter your email and we'll send you a link to reset your password."
    >
      <Form {...form}>
        <FormSchemaProvider schema={forgotPasswordSchema}>
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
              {loading ? "Sending…" : "Send reset link"}
            </Button>
            <p className="text-center">
              <AuthTextLink href="/login" className={AUTH_FOOTER_LINK_CLASS}>
                Back to sign in
              </AuthTextLink>
            </p>
          </form>
        </FormSchemaProvider>
      </Form>
    </AuthPanel>
  );
}
