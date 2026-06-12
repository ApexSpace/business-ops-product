"use client";

import { useState } from "react";
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
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">CodeSol</CardTitle>
        <CardDescription>Sign in to app.codesoltech.com</CardDescription>
      </CardHeader>
      <CardContent>
        {reasonParam === "subscription-canceled" ? (
          <p className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
            Your subscription was canceled and your workspace access has been
            removed. Sign in again to open another workspace.
          </p>
        ) : null}
        {errorParam === "no_access" ? (
          <p className="mb-4 text-sm text-destructive">
            Your account has no active platform or business access.
          </p>
        ) : null}
        <Form {...form}>
          <FormSchemaProvider schema={loginSchema}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      autoComplete="email"
                      placeholder="you@company.com"
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
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        autoComplete="current-password"
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
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in…" : "Sign in"}
            </Button>
            </form>
          </FormSchemaProvider>
        </Form>
      </CardContent>
    </Card>
  );
}
