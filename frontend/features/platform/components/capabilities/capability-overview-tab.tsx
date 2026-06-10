"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { TextField } from "@/components/forms/text-field";
import { Form, FormSchemaProvider } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import type { CapabilityDetail } from "@/features/platform/types/capability";
import {
  updateCapabilitySchema,
  type UpdateCapabilityValues,
} from "@/features/platform/schemas/capability-form";

export const CAPABILITY_OVERVIEW_FORM_ID = "capability-overview-form";

export function CapabilityOverviewTab({
  capability,
  canManage,
  onSave,
}: {
  capability: CapabilityDetail;
  canManage: boolean;
  onSave: (values: UpdateCapabilityValues) => void;
}) {
  const form = useForm<UpdateCapabilityValues>({
    resolver: zodResolver(updateCapabilitySchema),
    values: {
      name: capability.name,
      description: capability.description ?? "",
    },
  });

  return (
    <div className="space-y-6">
      {canManage ? (
        <div className="rounded-lg ring-1 ring-border/70 p-4">
          <h3 className="text-sm font-medium">Details</h3>
          <Form {...form}>
            <FormSchemaProvider schema={updateCapabilitySchema}>
              <form
                id={CAPABILITY_OVERVIEW_FORM_ID}
                onSubmit={form.handleSubmit(onSave)}
                className="mt-4 space-y-4"
              >
                <TextField control={form.control} name="name" label="Name" />
                <TextField
                  control={form.control}
                  name="description"
                  label="Description"
                  multiline
                />
              </form>
            </FormSchemaProvider>
          </Form>
        </div>
      ) : (
        <div className="rounded-lg ring-1 ring-border/70 p-4 space-y-3">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Name</p>
            <p className="mt-1 text-sm">{capability.name}</p>
          </div>
          {capability.description ? (
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Description
              </p>
              <p className="mt-1 text-sm">{capability.description}</p>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

export function CapabilityOverviewTabSkeleton() {
  return <Skeleton className="h-64 w-full rounded-lg" />;
}
