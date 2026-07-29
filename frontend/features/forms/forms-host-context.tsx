"use client";

import { createContext, useContext, type ReactNode } from "react";

export type FormsHostMode = "business" | "platform";

export type FormsHostConfig = {
  mode: FormsHostMode;
  /** UI route prefix, e.g. `/business/settings/forms` or `/platform/forms` */
  basePath: string;
  /** API path prefix, e.g. `forms` or `platform/forms` */
  apiBase: string;
};

export const BUSINESS_FORMS_HOST: FormsHostConfig = {
  mode: "business",
  basePath: "/business/settings/forms",
  apiBase: "forms",
};

export const PLATFORM_FORMS_HOST: FormsHostConfig = {
  mode: "platform",
  basePath: "/platform/forms",
  apiBase: "platform/forms",
};

const FormsHostContext = createContext<FormsHostConfig>(BUSINESS_FORMS_HOST);

export function FormsHostProvider({
  value,
  children,
}: {
  value: FormsHostConfig;
  children: ReactNode;
}) {
  return (
    <FormsHostContext.Provider value={value}>
      {children}
    </FormsHostContext.Provider>
  );
}

export function useFormsHost(): FormsHostConfig {
  return useContext(FormsHostContext);
}
