"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { FormDialog } from "@/components/forms/form-dialog";
import { BusinessProfileFormFields } from "@/components/platform/business-profile-form-fields";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api-client";
import {
  businessProfileDefaultValues,
  businessProfileSchema,
  profileFormToApiBody,
  type BusinessProfileFormValues,
} from "@/lib/business-profile";
import { invalidatePlatformBusinesses } from "@/lib/query-invalidation";
import type { Business } from "@/types/api";

export function CreateBusinessDialog() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const form = useForm<BusinessProfileFormValues>({
    resolver: zodResolver(businessProfileSchema),
    defaultValues: businessProfileDefaultValues,
  });

  const mutation = useMutation({
    mutationFn: (values: BusinessProfileFormValues) =>
      apiClient<Business>("platform/businesses", {
        method: "POST",
        body: profileFormToApiBody(values),
      }),
    onSuccess: () => {
      toast.success("Business created");
      void invalidatePlatformBusinesses(queryClient);
      setOpen(false);
      form.reset(businessProfileDefaultValues);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        <Plus className="mr-2 size-4" />
        Create business
      </Button>
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title="New business"
        form={form}
        schema={businessProfileSchema}
        onSubmit={(v) => mutation.mutate(v)}
        isPending={mutation.isPending}
        submitLabel="Create"
        className="sm:max-w-2xl"
      >
        <BusinessProfileFormFields form={form} />
      </FormDialog>
    </>
  );
}
