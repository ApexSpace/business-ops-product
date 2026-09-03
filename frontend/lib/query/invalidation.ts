import type { QueryClient } from "@tanstack/react-query";
import { queryKeys } from "./keys";

export function invalidateServiceLists(queryClient: QueryClient) {
  return Promise.all([
    queryClient.invalidateQueries({
      queryKey: queryKeys.services.all(),
      predicate: (query) => {
        const key = query.queryKey;
        return key[1] === "list" || key.length === 1;
      },
    }),
    queryClient.invalidateQueries({ queryKey: queryKeys.services.tree() }),
  ]);
}

export function invalidateServiceWorkspace(
  queryClient: QueryClient,
  serviceId: string,
) {
  return Promise.all([
    queryClient.invalidateQueries({
      queryKey: queryKeys.services.workspace(serviceId),
    }),
    invalidateServiceLists(queryClient),
    invalidateServicePicker(queryClient),
  ]);
}

export function invalidateServiceCategories(queryClient: QueryClient) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.serviceCategories.all() }),
    queryClient.invalidateQueries({ queryKey: queryKeys.services.tree() }),
  ]);
}

export function invalidateServicePicker(queryClient: QueryClient) {
  return queryClient.invalidateQueries({
    queryKey: queryKeys.services.picker(),
  });
}

/** Invalidate contact list queries only (not picker unless needed). */
export function invalidateContactLists(
  queryClient: QueryClient,
  apiBase = "contacts",
) {
  return queryClient.invalidateQueries({
    queryKey: queryKeys.contacts.all(apiBase),
    predicate: (query) => {
      const key = query.queryKey;
      return key.includes("list") || key.length <= 2;
    },
  });
}

export function invalidateContactPicker(
  queryClient: QueryClient,
  apiBase = "contacts",
) {
  return Promise.all([
    queryClient.invalidateQueries({
      queryKey: queryKeys.contacts.picker(apiBase),
    }),
    queryClient.invalidateQueries({
      queryKey: queryKeys.contacts.all(apiBase),
      predicate: (query) => query.queryKey.includes("search"),
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

export function invalidateContactWorkspace(
  queryClient: QueryClient,
  contactId: string,
) {
  return Promise.all([
    queryClient.invalidateQueries({
      queryKey: queryKeys.contacts.timeline(contactId),
    }),
    queryClient.invalidateQueries({
      queryKey: queryKeys.contacts.wallet(contactId),
    }),
    queryClient.invalidateQueries({
      queryKey: queryKeys.contacts.adjustments(contactId),
    }),
    queryClient.invalidateQueries({
      queryKey: queryKeys.contacts.memberships(contactId),
    }),
  ]);
}

export function invalidateWorkItemLists(
  queryClient: QueryClient,
  apiBase = "work-items",
) {
  return queryClient.invalidateQueries({
    queryKey: queryKeys.workItems.all(apiBase),
  });
}

export function invalidateSocialPlanner(queryClient: QueryClient) {
  return queryClient.invalidateQueries({
    queryKey: queryKeys.socialPlanner.all(),
  });
}

export function invalidateBusinessDashboardStats(queryClient: QueryClient) {
  return Promise.all([
    queryClient.invalidateQueries({
      queryKey: queryKeys.business.dashboardStats(),
    }),
    queryClient.invalidateQueries({
      queryKey: queryKeys.business.dashboardFeed(),
    }),
  ]);
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

export function invalidateProductLists(queryClient: QueryClient) {
  return queryClient.invalidateQueries({
    queryKey: queryKeys.products.all(),
    predicate: (query) => {
      const key = query.queryKey;
      return key[1] === "list" || key[1] === "picker" || key.length === 1;
    },
  });
}

export function invalidateProductDetail(
  queryClient: QueryClient,
  id: string,
) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.products.detail(id) }),
    queryClient.invalidateQueries({
      queryKey: queryKeys.products.variants(id),
    }),
    queryClient.invalidateQueries({
      queryKey: queryKeys.products.options(id),
    }),
    queryClient.invalidateQueries({
      predicate: (query) =>
        query.queryKey[0] === "products" &&
        query.queryKey[1] === id &&
        query.queryKey[2] === "inventory",
    }),
  ]);
}

export function invalidateProductCategories(queryClient: QueryClient) {
  return queryClient.invalidateQueries({
    queryKey: queryKeys.products.categories(),
  });
}

export function invalidateResources(queryClient: QueryClient) {
  return queryClient.invalidateQueries({
    queryKey: queryKeys.resources.all(),
  });
}

export function invalidateGiftCards(queryClient: QueryClient) {
  return queryClient.invalidateQueries({
    queryKey: queryKeys.giftCards.all(),
  });
}

export function invalidatePackages(queryClient: QueryClient) {
  return queryClient.invalidateQueries({
    queryKey: queryKeys.packages.all(),
  });
}

export function invalidateOffers(queryClient: QueryClient) {
  return queryClient.invalidateQueries({
    queryKey: queryKeys.offers.all(),
  });
}

export function invalidateMemberships(queryClient: QueryClient) {
  return queryClient.invalidateQueries({
    queryKey: queryKeys.memberships.all(),
  });
}

export function invalidateResourceGroups(queryClient: QueryClient) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.resources.groups() }),
    invalidateResources(queryClient),
  ]);
}

export function invalidateResourceWorkspace(
  queryClient: QueryClient,
  resourceId: string,
) {
  return Promise.all([
    queryClient.invalidateQueries({
      queryKey: queryKeys.resources.workspace(resourceId),
    }),
    invalidateResources(queryClient),
  ]);
}

export function invalidateResourcePicker(queryClient: QueryClient) {
  return queryClient.invalidateQueries({
    predicate: (query) =>
      query.queryKey[0] === "resources" && query.queryKey[1] === "picker",
  });
}

export function invalidateProductPicker(queryClient: QueryClient) {
  return queryClient.invalidateQueries({
    predicate: (query) =>
      query.queryKey[0] === "products" && query.queryKey[1] === "picker",
  });
}

export function invalidateCheckouts(
  queryClient: QueryClient,
  id?: string,
) {
  const tasks = [
    queryClient.invalidateQueries({ queryKey: queryKeys.checkouts.all() }),
    invalidatePaymentLists(queryClient),
    queryClient.invalidateQueries({ queryKey: queryKeys.invoices.all() }),
  ];
  if (id) {
    tasks.push(
      queryClient.invalidateQueries({
        queryKey: queryKeys.checkouts.detail(id),
      }),
    );
  }
  return Promise.all(tasks);
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

export function invalidateFormLists(queryClient: QueryClient) {
  return queryClient.invalidateQueries({
    queryKey: queryKeys.forms.all(),
  });
}

export function invalidateFormDetail(queryClient: QueryClient, id: string) {
  return queryClient.invalidateQueries({
    queryKey: queryKeys.forms.all(),
    predicate: (query) => {
      const key = query.queryKey;
      return key.includes("detail") && key.includes(id);
    },
  });
}

export function invalidateFormSubmissions(
  queryClient: QueryClient,
  formId: string,
) {
  return queryClient.invalidateQueries({
    queryKey: queryKeys.forms.all(),
    predicate: (query) => {
      const key = query.queryKey;
      return key.includes(formId) && key.includes("submissions");
    },
  });
}

export function invalidateChatbotLists(
  queryClient: QueryClient,
  apiBase = "chatbots",
) {
  return queryClient.invalidateQueries({
    queryKey: queryKeys.chatbots.all(apiBase),
  });
}

export function invalidateChatbotDetail(
  queryClient: QueryClient,
  id: string,
  apiBase = "chatbots",
) {
  return queryClient.invalidateQueries({
    queryKey: queryKeys.chatbots.detail(apiBase, id),
  });
}

export function invalidateChatbotDefault(
  queryClient: QueryClient,
  apiBase = "chatbots",
) {
  return queryClient.invalidateQueries({
    queryKey: queryKeys.chatbots.default(apiBase),
  });
}

export function invalidateSchedulingSettings(queryClient: QueryClient) {
  return queryClient.invalidateQueries({
    queryKey: queryKeys.schedulingSettings.detail(),
  });
}

export function invalidateOnlineBookingSettings(queryClient: QueryClient) {
  return queryClient.invalidateQueries({
    queryKey: queryKeys.onlineBookingSettings.detail(),
  });
}

export function invalidateCalendarDisplaySettings(queryClient: QueryClient) {
  return queryClient.invalidateQueries({
    queryKey: queryKeys.calendarDisplaySettings.detail(),
  });
}

export function invalidateWaitingRoomSettings(queryClient: QueryClient) {
  return queryClient.invalidateQueries({
    queryKey: queryKeys.waitingRoomSettings.detail(),
  });
}

export function invalidateAppointmentAutomatedMessages(
  queryClient: QueryClient,
  eventType: string,
) {
  return queryClient.invalidateQueries({
    queryKey: queryKeys.appointmentAutomatedMessages.detail(eventType),
  });
}

export function invalidateCancelRescheduleSettings(queryClient: QueryClient) {
  return queryClient.invalidateQueries({
    queryKey: queryKeys.cancelRescheduleSettings.detail(),
  });
}

export function invalidateCustomFees(queryClient: QueryClient) {
  return queryClient.invalidateQueries({
    queryKey: queryKeys.customFees.all(),
  });
}

export function invalidateCheckoutAdvancedSettings(queryClient: QueryClient) {
  return queryClient.invalidateQueries({
    queryKey: queryKeys.checkoutAdvancedSettings.detail(),
  });
}

export function invalidateTimeCardLists(queryClient: QueryClient) {
  return queryClient.invalidateQueries({
    queryKey: queryKeys.timeClock.all(),
    predicate: (query) => query.queryKey[2] === "list",
  });
}

export function invalidateTimeCardDetail(queryClient: QueryClient, id: string) {
  return queryClient.invalidateQueries({
    queryKey: queryKeys.timeClock.cards.detail(id),
  });
}
