"use client";

import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AutomationRegistryBrowser } from "@/features/automations/components/automation-registry-browser";
import { useAutomationsHost } from "@/features/automations/automations-host-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ListPageSkeleton } from "@/components/layout/list-page";

function AutomationRegistryPageContent() {
  const { basePath } = useAutomationsHost();
  return (
    <div className="space-y-4">
      <Button
        variant="ghost"
        size="sm"
        nativeButton={false}
        render={<Link href={basePath} />}
      >
        <ArrowLeft className="mr-1 size-4" />
        Back to workflows
      </Button>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Registry browser</CardTitle>
        </CardHeader>
        <CardContent>
          <AutomationRegistryBrowser />
        </CardContent>
      </Card>
    </div>
  );
}

export function AutomationRegistryPage() {
  return (
    <Suspense fallback={<ListPageSkeleton />}>
      <AutomationRegistryPageContent />
    </Suspense>
  );
}
