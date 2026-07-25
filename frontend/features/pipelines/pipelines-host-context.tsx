"use client";

import { createContext, useContext, type ReactNode } from "react";

export type PipelinesHostMode = "business" | "platform";

export type PipelinesHostConfig = {
  mode: PipelinesHostMode;
  basePath: string;
  apiBase: string;
};

export const BUSINESS_PIPELINES_HOST: PipelinesHostConfig = {
  mode: "business",
  basePath: "/business/pipelines",
  apiBase: "pipelines",
};

export const PLATFORM_PIPELINES_HOST: PipelinesHostConfig = {
  mode: "platform",
  basePath: "/platform/pipelines",
  apiBase: "platform/pipelines",
};

const PipelinesHostContext = createContext<PipelinesHostConfig>(
  BUSINESS_PIPELINES_HOST,
);

export function PipelinesHostProvider({
  value,
  children,
}: {
  value: PipelinesHostConfig;
  children: ReactNode;
}) {
  return (
    <PipelinesHostContext.Provider value={value}>
      {children}
    </PipelinesHostContext.Provider>
  );
}

export function usePipelinesHost(): PipelinesHostConfig {
  return useContext(PipelinesHostContext);
}
