"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FormActions } from "@/components/layout/form-actions";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormSchemaProvider,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useAuth } from "@/lib/auth-provider";
import { canManagePlatformSettings } from "@/lib/permissions";
import type { PlatformSettings } from "@/types/api";

const schema = z.object({
  platformName: z.string().min(2),
  supportEmail: z.string().email(),
  defaultTrialDays: z.number().min(0),
  maintenanceMode: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

export default function PlatformSettingsPage() {
  const { jwt } = useAuth();
  const queryClient = useQueryClient();
  const canManage = canManagePlatformSettings(jwt?.platformRole);

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.platform.settings(),
    queryFn: () => apiClient<PlatformSettings>("platform/settings"),
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      platformName: "",
      supportEmail: "",
      defaultTrialDays: 14,
      maintenanceMode: false,
    },
  });

  useEffect(() => {
    if (data) {
      form.reset(data);
    }
  }, [data, form]);

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      apiClient<PlatformSettings>("platform/settings", {
        method: "PATCH",
        body: values,
      }),
    onSuccess: () => {
      toast.success("Settings saved");
      void queryClient.invalidateQueries({ queryKey: queryKeys.platform.settings() });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="space-y-6">
      <PageHeader />

      <Form {...form}>
        <FormSchemaProvider schema={schema}>
          <form
          onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
          className="max-w-lg space-y-6"
        >
          <FormField
            control={form.control}
            name="platformName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Platform name</FormLabel>
                <FormControl>
                  <Input {...field} disabled={!canManage} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="supportEmail"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Support email</FormLabel>
                <FormControl>
                  <Input type="email" {...field} disabled={!canManage} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="defaultTrialDays"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Default trial days</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    {...field}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                    disabled={!canManage}
                  />
                </FormControl>
                <FormDescription>
                  Applied when assigning a new subscription without a period end.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="maintenanceMode"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between rounded-md border p-4">
                <div className="space-y-0.5">
                  <FormLabel>Maintenance mode</FormLabel>
                  <FormDescription>
                    When enabled, non-platform users cannot access the app.
                  </FormDescription>
                </div>
                <FormControl>
                  <input
                    type="checkbox"
                    checked={field.value}
                    onChange={(e) => field.onChange(e.target.checked)}
                    disabled={!canManage}
                    className="size-4 rounded border"
                  />
                </FormControl>
              </FormItem>
            )}
          />
          {canManage ? (
            <FormActions>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Saving…" : "Save settings"}
              </Button>
            </FormActions>
          ) : null}
          </form>
        </FormSchemaProvider>
      </Form>
    </div>
  );
}
