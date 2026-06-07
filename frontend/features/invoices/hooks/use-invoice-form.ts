"use client";

import { useEffect, useMemo, useState } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  calculateFormTotals,
  canSendInvoiceFromForm,
  invoiceFormDefaults,
  invoiceFormSchema,
  invoiceFormToApiBody,
  invoiceFromEstimate,
  invoiceToForm,
  type InvoiceFormValues,
} from "@/features/invoices/schemas/invoice-profile";
import { applyInvoiceDefaults } from "@/features/settings/schemas/financial-settings-profile";
import { listEstimates } from "@/features/estimates/api/estimates.api";
import {
  createInvoice,
  updateInvoice,
  updateInvoiceStatus,
} from "@/features/invoices/api/invoices.api";
import { getFinancialSettings } from "@/features/settings/api/financial.api";
import { listServices } from "@/features/settings/api/services.api";
import { listWorkItems } from "@/features/work-items/api/work-items.api";
import { queryKeys } from "@/lib/query/keys";
import type { Estimate, Invoice } from "@/features/invoices/types";

export interface UseInvoiceFormOptions {
  open: boolean;
  invoice?: Invoice | null;
  defaultContactId?: string;
  defaultContactLabel?: string;
  defaultEstimateId?: string;
  defaultWorkItemId?: string;
  prefillFromEstimate?: Estimate | null;
  onSuccess: () => void;
  onOpenChange: (open: boolean) => void;
}

export function useInvoiceForm({
  open,
  invoice,
  defaultContactId,
  defaultContactLabel,
  defaultEstimateId,
  defaultWorkItemId,
  prefillFromEstimate,
  onSuccess,
  onOpenChange,
}: UseInvoiceFormOptions) {
  const isEdit = !!invoice;

  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: invoiceFormDefaults,
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const watched = useWatch({ control: form.control });
  const totals = useMemo(() => {
    const items = (watched.items ?? invoiceFormDefaults.items).map((item) => ({
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

  const { data: estimates } = useQuery({
    queryKey: queryKeys.estimates.list({
      contactId: contactId || undefined,
      page: 1,
      limit: 50,
    }),
    queryFn: () =>
      listEstimates({
        page: 1,
        limit: 50,
        contactId: contactId || undefined,
      }),
    enabled: open && !!contactId,
  });

  const estimateItems = useMemo(() => {
    const items =
      estimates?.items.map((e) => ({
        value: e.id,
        label: e.estimateNumber,
      })) ?? [];
    return [{ value: "", label: "None" }, ...items];
  }, [estimates?.items]);

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
    if (invoice) {
      form.reset(invoiceToForm(invoice));
    } else if (prefillFromEstimate) {
      form.reset(invoiceFromEstimate(prefillFromEstimate));
    } else {
      const base = {
        ...invoiceFormDefaults,
        contactId: defaultContactId ?? "",
        estimateId: defaultEstimateId ?? "",
        workItemId: defaultWorkItemId ?? "",
      };
      form.reset(
        financialSettings ? applyInvoiceDefaults(base, financialSettings) : base,
      );
    }
  }, [
    open,
    invoice,
    prefillFromEstimate,
    defaultContactId,
    defaultEstimateId,
    defaultWorkItemId,
    financialSettings,
    form,
  ]);

  const canSend = canSendInvoiceFromForm(invoice, isEdit);

  const mutation = useMutation({
    mutationFn: async ({
      values,
      intent,
    }: {
      values: InvoiceFormValues;
      intent: "draft" | "send";
    }) => {
      if (isEdit && invoice) {
        const preserveStatus = invoice.status !== "DRAFT";
        const body = invoiceFormToApiBody(values, {
          includeStatus: !preserveStatus,
          status: "DRAFT",
        });
        await updateInvoice(invoice.id, body);

        if (intent === "send" && invoice.status === "DRAFT") {
          return updateInvoiceStatus(invoice.id, "SENT");
        }

        return;
      }

      const body = invoiceFormToApiBody(values, {
        status: intent === "send" ? "SENT" : "DRAFT",
      });
      return createInvoice(body);
    },
    onSuccess: (_data, { intent }) => {
      if (intent === "send") {
        toast.success("Invoice sent");
      } else if (isEdit) {
        toast.success("Invoice updated");
      } else {
        toast.success("Invoice saved as draft");
      }
      onSuccess();
      onOpenChange(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const [pendingAction, setPendingAction] = useState<
    "primary" | "secondary" | null
  >(null);

  useEffect(() => {
    if (!mutation.isPending) {
      setPendingAction(null);
    }
  }, [mutation.isPending]);

  const saveDraft = (values: InvoiceFormValues) => {
    setPendingAction(canSend ? "secondary" : "primary");
    mutation.mutate({ values, intent: "draft" });
  };

  const sendInvoice = (values: InvoiceFormValues) => {
    setPendingAction("primary");
    mutation.mutate({ values, intent: "send" });
  };

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
    pendingAction,
    canSend,
    saveDraft,
    sendInvoice,
    contactId,
    lockedContact,
    serviceItems,
    estimateItems,
    workItemItems,
    applyServiceToLine,
    invoice,
    currencyCode,
  };
}
