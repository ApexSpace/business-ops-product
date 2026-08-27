"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import dynamic from "next/dynamic";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { workflowStatusLabel } from "@/features/automations/api/workflows.api";
import { useAutomationsHost } from "@/features/automations/automations-host-context";
import { EnrollmentHistoryPanel } from "@/features/automations/components/enrollment-history-panel";
import { ExecutionLogsPanel } from "@/features/automations/components/execution-logs-panel";
import { WorkflowSettingsPanel } from "@/features/automations/components/workflow-settings-panel";
import {
  useAutomationWorkflowDetail,
  useAutomationWorkflowMutations,
} from "@/features/automations/hooks/use-automation-workflows";

const WorkflowBuilder = dynamic(
  () =>
    import("@/features/automations/components/workflow-builder").then(
      (m) => m.WorkflowBuilder,
    ),
  {
    loading: () => <Skeleton className="min-h-[16rem] w-full" />,
    ssr: false,
  },
);

export function AutomationWorkflowEditorPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { basePath } = useAutomationsHost();
  const id = params.id;
  const [activeTab, setActiveTab] = useState("builder");
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const { data: workflow, isLoading } = useAutomationWorkflowDetail(id);
  const { updateMutation, statusMutation } = useAutomationWorkflowMutations();

  if (isLoading || !workflow) {
    return (
      <div className="text-sm text-muted-foreground">Loading workflow…</div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          nativeButton={false}
          render={<Link href={basePath} />}
        >
          <ArrowLeft className="mr-1 size-4" />
          Back
        </Button>
        <Badge>{workflowStatusLabel(workflow.status)}</Badge>
        {workflow.isSystemTemplate ? (
          <Badge variant="outline">System template</Badge>
        ) : null}
        {workflow.status !== "ACTIVE" ? (
          <Button
            variant="brand"
            size="sm"
            onClick={() =>
              statusMutation.mutate({ id: workflow.id, status: "ACTIVE" })
            }
          >
            Activate
          </Button>
        ) : (
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              statusMutation.mutate({ id: workflow.id, status: "INACTIVE" })
            }
          >
            Deactivate
          </Button>
        )}
      </div>

      <PageHeader
        title={workflow.name}
        description="Configure trigger, filters, steps, settings, and observability."
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="builder">Builder</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="enrollment">Enrollment history</TabsTrigger>
          <TabsTrigger value="logs">Execution logs</TabsTrigger>
        </TabsList>

        <TabsContent value="builder" className="mt-4">
          <WorkflowBuilder
            workflow={workflow}
            isSaving={updateMutation.isPending}
            onSave={(payload) =>
              updateMutation.mutate(
                {
                  id: workflow.id,
                  body: {
                    ...payload,
                    settings: workflow.settings,
                  },
                },
                {
                  onSuccess: () => router.refresh(),
                },
              )
            }
          />
        </TabsContent>

        <TabsContent value="settings" className="mt-4">
          <WorkflowSettingsPanel
            settings={workflow.settings}
            isSaving={updateMutation.isPending}
            onSave={(settings) =>
              updateMutation.mutate(
                {
                  id: workflow.id,
                  body: {
                    name: workflow.name,
                    description: workflow.description ?? undefined,
                    triggerKey: workflow.triggerKey,
                    triggerFilters: workflow.triggerFilters,
                    steps: workflow.steps,
                    settings,
                  },
                },
                {
                  onSuccess: () => router.refresh(),
                },
              )
            }
          />
        </TabsContent>

        <TabsContent value="enrollment" className="mt-4">
          <EnrollmentHistoryPanel
            workflowId={workflow.id}
            triggerKey={workflow.triggerKey}
            onSelectRun={(runId) => {
              setSelectedRunId(runId);
              setActiveTab("logs");
            }}
          />
        </TabsContent>

        <TabsContent value="logs" className="mt-4">
          <ExecutionLogsPanel
            workflowId={workflow.id}
            selectedRunId={selectedRunId}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
