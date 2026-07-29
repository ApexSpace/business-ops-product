"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
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
import { cn } from "@/lib/utils";

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
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Invalid reset link</CardTitle>
          <CardDescription>
            This password reset link is missing a token. Request a new link to
            continue.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <Link
            href="/forgot-password"
            className={cn(buttonVariants())}
          >
            Request a new link
          </Link>
        </CardContent>
      </Card>
    );
  }

  if (success) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Password updated</CardTitle>
          <CardDescription>
            Your password was changed successfully. Sign in with your new
            password.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <Link href="/login" className={cn(buttonVariants())}>
            Sign in
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Set a new password</CardTitle>
        <CardDescription>
          Choose a new password for your account. This link can only be used
          once.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <FormSchemaProvider schema={resetPasswordSchema}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          autoComplete="new-password"
                          className="pr-9"
                          {...field}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          className="absolute top-1/2 right-1 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          aria-label={
                            showPassword ? "Hide password" : "Show password"
                          }
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
                          className="pr-9"
                          {...field}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          className="absolute top-1/2 right-1 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          aria-label={
                            showConfirm ? "Hide password" : "Show password"
                          }
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
                {loading ? "Updating…" : "Update password"}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                <Link
                  href="/forgot-password"
                  className="underline-offset-4 hover:underline"
                >
                  Request a new link
                </Link>
              </p>
            </form>
          </FormSchemaProvider>
        </Form>
      </CardContent>
    </Card>
  );
}
