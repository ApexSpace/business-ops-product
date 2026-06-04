"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  financialSettingsDefaults,
  financialSettingsFormToApiBody,
  financialSettingsSchema,
  financialSettingsToForm,
  type FinancialSettingsFormValues,
} from "@/features/settings/schemas/financial-settings-profile";
import { queryKeys } from "@/lib/query/keys";
import { PERMISSIONS, useCan } from "@/features/auth/permissions";
import {
  getFinancialSettings,
  updateFinancialSettings,
} from "@/features/settings/api/financial.api";

export const FINANCIAL_SETTINGS_TABS = [
  { value: "invoice", label: "Invoice Settings" },
  { value: "estimate", label: "Estimate Settings" },
] as const;

function formatPreview(prefix: string, nextNumber: number): string {
  const normalized = prefix.trim().toUpperCase() || "DOC";
  return `${normalized}-${String(nextNumber).padStart(5, "0")}`;
}

export function useBusinessFinancialSettings() {
  const queryClient = useQueryClient();
  const canEdit = useCan(PERMISSIONS["settings.business"]);
  const [activeTab, setActiveTab] = useState<string>("invoice");

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.business.financialSettings(),
    queryFn: () => getFinancialSettings(),
  });

  const form = useForm<FinancialSettingsFormValues>({
    resolver: zodResolver(financialSettingsSchema),
    defaultValues: financialSettingsDefaults,
  });

  useEffect(() => {
    if (data) {
      form.reset(financialSettingsToForm(data));
    }
  }, [data, form]);

  const invoicePrefix = form.watch("invoice.prefix");
  const invoiceNext = form.watch("invoice.nextNumber");
  const estimatePrefix = form.watch("estimate.prefix");
  const estimateNext = form.watch("estimate.nextNumber");

  const invoicePreview = useMemo(
    () => formatPreview(invoicePrefix ?? "INV", invoiceNext ?? 1),
    [invoicePrefix, invoiceNext],
  );
  const estimatePreview = useMemo(
    () => formatPreview(estimatePrefix ?? "EST", estimateNext ?? 1),
    [estimatePrefix, estimateNext],
  );

  const mutation = useMutation({
    mutationFn: (values: FinancialSettingsFormValues) =>
      updateFinancialSettings(financialSettingsFormToApiBody(values)),
    onSuccess: (result) => {
      toast.success("Financial settings saved");
      form.reset(financialSettingsToForm(result));
      void queryClient.invalidateQueries({
        queryKey: queryKeys.business.financialSettings(),
      });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return {
    canEdit,
    activeTab,
    setActiveTab,
    isLoading,
    form,
    invoicePreview,
    estimatePreview,
    mutation,
  };
}
