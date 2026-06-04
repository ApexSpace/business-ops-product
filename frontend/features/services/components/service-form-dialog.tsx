"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { FormDialog } from "@/components/forms/form-dialog";
import { SearchableSelect } from "@/components/forms/searchable-select";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  profileFormToServiceApiBody,
  serviceProfileDefaultValues,
  serviceProfileSchema,
  serviceToProfileForm,
  type ServiceProfileFormValues,
} from "@/features/services/schemas/service-profile";
import type { Service } from "@/features/services/types";
import { createService, updateService } from "@/features/settings/api/services.api";

const statusOptions = [
  { value: "ACTIVE", label: "Active" },
  { value: "ARCHIVED", label: "Archived" },
];

interface ServiceFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service?: Service | null;
  onSuccess: () => void;
}

export function ServiceFormDialog({
  open,
  onOpenChange,
  service,
  onSuccess,
}: ServiceFormDialogProps) {
  const isEdit = !!service;

  const form = useForm<ServiceProfileFormValues>({
    resolver: zodResolver(serviceProfileSchema),
    defaultValues: serviceProfileDefaultValues,
  });

  useEffect(() => {
    if (open && service) {
      form.reset(serviceToProfileForm(service));
    } else if (open) {
      form.reset(serviceProfileDefaultValues);
    }
  }, [service, form, open]);

  const mutation = useMutation({
    mutationFn: (values: ServiceProfileFormValues) => {
      const body = profileFormToServiceApiBody(values);
      if (isEdit && service) {
        return updateService(service.id, body);
      }
      return createService(body);
    },
    onSuccess: () => {
      toast.success(isEdit ? "Service updated" : "Service created");
      onSuccess();
      onOpenChange(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? "Edit service" : "New service"}
      form={form}
      schema={serviceProfileSchema}
      onSubmit={(v) => mutation.mutate(v)}
      isPending={mutation.isPending}
      submitLabel={isEdit ? "Save changes" : "Create service"}
      className="sm:max-w-lg"
    >
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Name</FormLabel>
            <FormControl>
              <Input {...field} placeholder="e.g. Botox, AC repair" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="category"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Category (optional)</FormLabel>
            <FormControl>
              <Input {...field} placeholder="e.g. Injectables, HVAC" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Description (optional)</FormLabel>
            <FormControl>
              <Textarea {...field} rows={3} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="price"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Price (USD, optional)</FormLabel>
            <FormControl>
              <Input {...field} type="number" min={0} step="0.01" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      {isEdit ? (
        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem className="w-full">
              <FormLabel>Status</FormLabel>
              <FormControl>
                <SearchableSelect
                  items={statusOptions}
                  value={field.value}
                  onValueChange={field.onChange}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      ) : null}
    </FormDialog>
  );
}
