"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const AutomationWorkflowsList = dynamic(
  () =>
    import("@/features/automations/components/automation-workflows-list").then(
      (m) => m.AutomationWorkflowsList,
    ),
  {
    loading: () => <Skeleton className="min-h-[12rem] w-full" />,
  },
);

const AutomationRegistryBrowser = dynamic(
  () =>
    import("@/features/automations/components/automation-registry-browser").then(
      (m) => m.AutomationRegistryBrowser,
    ),
  {
    loading: () => <Skeleton className="min-h-[16rem] w-full" />,
  },
);

export function AutomationsSettingsPage() {
  const [tab, setTab] = useState("workflows");

  return (
    <div className="w-full min-w-0 space-y-6">
      <Tabs
        value={tab}
        onValueChange={(value) => setTab(value ?? "workflows")}
      >
        <TabsList>
          <TabsTrigger value="workflows">Workflows</TabsTrigger>
          <TabsTrigger value="registry">Registry</TabsTrigger>
        </TabsList>

        <TabsContent value="workflows" className="mt-4">
          <AutomationWorkflowsList />
        </TabsContent>

        <TabsContent value="registry" className="mt-4 space-y-4">
          {tab === "registry" ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Registry browser</CardTitle>
              </CardHeader>
              <CardContent>
                <AutomationRegistryBrowser />
              </CardContent>
            </Card>
          ) : null}
        </TabsContent>
      </Tabs>
    </div>
  );
}
