"use client";

import { createContext, useContext, type ReactNode } from "react";

export type WorkItemsHostMode = "business" | "platform";

export type WorkItemsHostConfig = {
  mode: WorkItemsHostMode;
  /** UI route prefix */
  basePath: string;
  /** Work items API path prefix */
  apiBase: string;
  /** Contacts API path prefix (picker / quick-create) */
  contactsApiBase: string;
  /** Services API path prefix (filters / form) — not used in platform mode */
  servicesApiBase?: string;
  /** Members API path prefix (assignee picker) */
  membersApiBase: string;
};

export const BUSINESS_WORK_ITEMS_HOST: WorkItemsHostConfig = {
  mode: "business",
  basePath: "/business/work-items",
  apiBase: "work-items",
  contactsApiBase: "contacts",
  servicesApiBase: "services",
  membersApiBase: "businesses/current/members",
};

export const PLATFORM_WORK_ITEMS_HOST: WorkItemsHostConfig = {
  mode: "platform",
  basePath: "/platform/work-items",
  apiBase: "platform/work-items",
  contactsApiBase: "platform/contacts",
  membersApiBase: "platform/ops/members",
};

const WorkItemsHostContext = createContext<WorkItemsHostConfig>(
  BUSINESS_WORK_ITEMS_HOST,
);

export function WorkItemsHostProvider({
  value,
  children,
}: {
  value: WorkItemsHostConfig;
  children: ReactNode;
}) {
  return (
    <WorkItemsHostContext.Provider value={value}>
      {children}
    </WorkItemsHostContext.Provider>
  );
}

export function useWorkItemsHost(): WorkItemsHostConfig {
  return useContext(WorkItemsHostContext);
}
