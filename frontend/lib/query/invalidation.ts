import type { QueryClient } from "@tanstack/react-query";
import { queryKeys } from "./keys";

export function invalidateServiceLists(queryClient: QueryClient) {
  return queryClient.invalidateQueries({
    queryKey: queryKeys.services.all(),
    predicate: (query) => {
      const key = query.queryKey;
      return key[1] === "list" || key.length === 1;
    },
  });
}

export function invalidateServicePicker(queryClient: QueryClient) {
  return queryClient.invalidateQueries({
    queryKey: queryKeys.services.picker(),
  });
}

/** Invalidate contact list queries only (not picker unless needed). */
export function invalidateContactLists(queryClient: QueryClient) {
  return queryClient.invalidateQueries({
    queryKey: queryKeys.contacts.all(),
    predicate: (query) => {
      const key = query.queryKey;
      return key[1] === "list" || key.length === 1;
    },
  });
}

export function invalidateContactPicker(queryClient: QueryClient) {
  return Promise.all([
    queryClient.invalidateQueries({
      queryKey: queryKeys.contacts.picker(),
    }),
    queryClient.invalidateQueries({
      queryKey: queryKeys.contacts.all(),
      predicate: (query) => query.queryKey[1] === "search",
    }),
  ]);
}

export function invalidateContactDetail(
  queryClient: QueryClient,
  id: string,
) {
  return queryClient.invalidateQueries({
    queryKey: queryKeys.contacts.detail(id),
  });
}

export function invalidateWorkItemLists(queryClient: QueryClient) {
  return queryClient.invalidateQueries({
    queryKey: queryKeys.workItems.all(),
    predicate: (query) => {
      const key = query.queryKey;
      return key[1] === "list" || key.length === 1;
    },
  });
}

export function invalidateBusinessDashboardStats(queryClient: QueryClient) {
  return queryClient.invalidateQueries({
    queryKey: queryKeys.business.dashboardStats(),
  });
}

export function invalidateNoteLists(queryClient: QueryClient) {
  return queryClient.invalidateQueries({
    queryKey: queryKeys.notes.all(),
    predicate: (query) => {
      const key = query.queryKey;
      return key[1] === "list" || key.length === 1;
    },
  });
}

export function invalidateNoteDetail(queryClient: QueryClient, id: string) {
  return queryClient.invalidateQueries({
    queryKey: queryKeys.notes.detail(id),
  });
}

export function invalidateTaskLists(queryClient: QueryClient) {
  return queryClient.invalidateQueries({
    queryKey: queryKeys.tasks.all(),
    predicate: (query) => {
      const key = query.queryKey;
      return key[1] === "list" || key.length === 1;
    },
  });
}

export function invalidateTaskDetail(queryClient: QueryClient, id: string) {
  return queryClient.invalidateQueries({
    queryKey: queryKeys.tasks.detail(id),
  });
}

export function invalidateInvoiceLists(queryClient: QueryClient) {
  return queryClient.invalidateQueries({
    queryKey: queryKeys.invoices.all(),
    predicate: (query) => {
      const key = query.queryKey;
      return key[1] === "list" || key.length === 1;
    },
  });
}

export function invalidateInvoiceDetail(
  queryClient: QueryClient,
  id: string,
) {
  return queryClient.invalidateQueries({
    queryKey: queryKeys.invoices.detail(id),
  });
}

export function invalidatePaymentLists(queryClient: QueryClient) {
  return queryClient.invalidateQueries({
    queryKey: queryKeys.payments.all(),
    predicate: (query) => {
      const key = query.queryKey;
      return key[1] === "list" || key.length === 1;
    },
  });
}

export function invalidateEstimateLists(queryClient: QueryClient) {
  return queryClient.invalidateQueries({
    queryKey: queryKeys.estimates.all(),
    predicate: (query) => {
      const key = query.queryKey;
      return key[1] === "list" || key.length === 1;
    },
  });
}

export function invalidateEstimateDetail(
  queryClient: QueryClient,
  id: string,
) {
  return queryClient.invalidateQueries({
    queryKey: queryKeys.estimates.detail(id),
  });
}

export function invalidateLeadLists(queryClient: QueryClient) {
  return queryClient.invalidateQueries({
    queryKey: queryKeys.leads.all(),
    predicate: (query) => {
      const key = query.queryKey;
      return key[1] === "list" || key[1] === "pipeline";
    },
  });
}

export function invalidateLeadPipeline(
  queryClient: QueryClient,
  pipelineId: string,
) {
  return queryClient.invalidateQueries({
    queryKey: queryKeys.leads.pipeline(pipelineId),
  });
}

export function invalidatePipelines(queryClient: QueryClient) {
  return queryClient.invalidateQueries({
    queryKey: queryKeys.pipelines.all(),
  });
}

export function invalidateBusinessMembers(queryClient: QueryClient) {
  return queryClient.invalidateQueries({
    queryKey: ["business", "members"],
    predicate: (query) => query.queryKey[0] === "business" && query.queryKey[1] === "members",
  });
}

export function invalidatePlatformBusinesses(queryClient: QueryClient) {
  return queryClient.invalidateQueries({
    queryKey: queryKeys.platform.businesses.all(),
  });
}

export function invalidatePlatformAuditLogs(queryClient: QueryClient) {
  return queryClient.invalidateQueries({
    queryKey: queryKeys.platform.auditLogs.all(),
  });
}
