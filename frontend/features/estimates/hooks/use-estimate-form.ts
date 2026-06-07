"use client";

import { useEffect, useMemo } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  calculateFormTotals,
  estimateFormDefaults,
  estimateFormSchema,
  estimateFormToApiBody,
  estimateToForm,
  type EstimateFormValues,
} from "@/features/estimates/schemas/estimate-profile";
import { applyEstimateDefaults } from "@/features/settings/schemas/financial-settings-profile";
import { createEstimate, updateEstimate } from "@/features/estimates/api/estimates.api";
import { getFinancialSettings } from "@/features/settings/api/financial.api";
import { listServices } from "@/features/settings/api/services.api";
import { listWorkItems } from "@/features/work-items/api/work-items.api";
import { queryKeys } from "@/lib/query/keys";
import type { Estimate } from "@/features/estimates/types";

export interface UseEstimateFormOptions {
  open: boolean;
  estimate?: Estimate | null;
  defaultContactId?: string;
  defaultContactLabel?: string;
  onSuccess: () => void;
  onOpenChange: (open: boolean) => void;
}

export function useEstimateForm({
  open,
  estimate,
  defaultContactId,
  defaultContactLabel,
  onSuccess,
  onOpenChange,
}: UseEstimateFormOptions) {
  const isEdit = !!estimate;

  const form = useForm<EstimateFormValues>({
    resolver: zodResolver(estimateFormSchema),
    defaultValues: estimateFormDefaults,
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const watched = useWatch({ control: form.control });
  const totals = useMemo(() => {
    const items = (watched.items ?? estimateFormDefaults.items).map((item) => ({
      title: item.title ?? "",
      quantity: Number(item.quantity) || 0,
      unitPrice: Number(item.unitPrice) || 0,
      serviceId: item.serviceId,
      description: item.description,
    }));
    return calculateFormTotals({
      items,
      taxAmount: Number(watched.taxAmount) || 0,
      discountAmount: Number(watched.discountAmount) || 0,
    });
  }, [watched.items, watched.taxAmount, watched.discountAmount]);

  const { data: financialSettings } = useQuery({
    queryKey: queryKeys.business.financialSettings(),
    queryFn: () => getFinancialSettings(),
    enabled: open,
  });

  const currencyCode = financialSettings?.taxesAndCurrency.currencyCode ?? "USD";

  const { data: services } = useQuery({
    queryKey: queryKeys.services.picker(),
    queryFn: () => listServices({ page: 1, limit: 100, status: "ACTIVE" }),
    enabled: open,
  });

  const contactId = watched.contactId;
  const { data: workItems } = useQuery({
    queryKey: queryKeys.workItems.list({
      contactId: contactId || undefined,
      page: 1,
      limit: 50,
    }),
    queryFn: () =>
      listWorkItems({ page: 1, limit: 50, contactId: contactId || undefined }),
    enabled: open && !!contactId,
  });

  const lockedContact = useMemo(() => {
    if (!defaultContactId || !defaultContactLabel) return undefined;
    return { id: defaultContactId, label: defaultContactLabel };
  }, [defaultContactId, defaultContactLabel]);

  const serviceItems = useMemo(() => {
    const items =
      services?.items.map((s) => ({
        value: s.id,
        label: s.category ? `${s.name} (${s.category})` : s.name,
      })) ?? [];
    return [{ value: "", label: "Custom line" }, ...items];
  }, [services?.items]);

  const workItemItems = useMemo(() => {
    const items =
      workItems?.items.map((w) => ({
        value: w.id,
        label: w.title,
      })) ?? [];
    return [{ value: "", label: "None" }, ...items];
  }, [workItems?.items]);

  useEffect(() => {
    if (!open) return;
    if (estimate) {
      form.reset(estimateToForm(estimate));
    } else {
      const base = {
        ...estimateFormDefaults,
        contactId: defaultContactId ?? "",
      };
      form.reset(
        financialSettings ? applyEstimateDefaults(base, financialSettings) : base,
      );
    }
  }, [open, estimate, defaultContactId, financialSettings, form]);

  const mutation = useMutation({
    mutationFn: async (values: EstimateFormValues) => {
      const body = estimateFormToApiBody(values);
      if (isEdit && estimate) {
        return updateEstimate(estimate.id, body);
      }
      return createEstimate(body);
    },
    onSuccess: () => {
      toast.success(isEdit ? "Estimate updated" : "Estimate created");
      onSuccess();
      onOpenChange(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const applyServiceToLine = (index: number, serviceId: string) => {
    const service = services?.items.find((s) => s.id === serviceId);
    if (!service) return;
    form.setValue(`items.${index}.title`, service.name);
    if (service.price) {
      form.setValue(`items.${index}.unitPrice`, parseFloat(service.price));
    }
  };

  return {
    isEdit,
    form,
    fields,
    append,
    remove,
    watched,
    totals,
    mutation,
    contactId,
    lockedContact,
    serviceItems,
    workItemItems,
    applyServiceToLine,
    estimate: estimate ?? null,
    currencyCode,
  };
}
