"use client";

import { createContext, useContext, type ReactNode } from "react";

export type AutomationsHostMode = "business" | "platform";

export type AutomationsHostConfig = {
  mode: AutomationsHostMode;
  /** UI route for the workflows list */
  basePath: string;
  /** UI route prefix for create/edit (may match basePath on platform) */
  workflowsBasePath: string;
  /** Optional registry browser route; omit to hide Registry CTA */
  registryPath?: string;
  /** API path prefix, e.g. `automations` or `platform/automations` */
  apiBase: string;
};

export const BUSINESS_AUTOMATIONS_HOST: AutomationsHostConfig = {
  mode: "business",
  basePath: "/business/settings/automations",
  workflowsBasePath: "/business/settings/automation-workflows",
  registryPath: "/business/settings/automation-registry",
  apiBase: "automations",
};

export const PLATFORM_AUTOMATIONS_HOST: AutomationsHostConfig = {
  mode: "platform",
  basePath: "/platform/automations",
  workflowsBasePath: "/platform/automations",
  apiBase: "platform/automations",
};

const AutomationsHostContext = createContext<AutomationsHostConfig>(
  BUSINESS_AUTOMATIONS_HOST,
);

export function AutomationsHostProvider({
  value,
  children,
}: {
  value: AutomationsHostConfig;
  children: ReactNode;
}) {
  return (
    <AutomationsHostContext.Provider value={value}>
      {children}
    </AutomationsHostContext.Provider>
  );
}

export function useAutomationsHost(): AutomationsHostConfig {
  return useContext(AutomationsHostContext);
}
