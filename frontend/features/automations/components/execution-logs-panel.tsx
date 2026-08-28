"use client";

import { useMemo, useState } from "react";
import {
  DataTable,
  type DataTableColumn,
} from "@/components/data-display/data-table";
import { EmptyState } from "@/components/data-display/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAutomationWorkflowRuns } from "@/features/automations/hooks/use-automation-workflows";
import type {
  AutomationWorkflowRun,
  WorkflowRunStatus,
} from "@/features/automations/types/workflow";
import { cn } from "@/lib/utils";
import { FILTER_ALL_LABELS } from "@/lib/ui/filter-labels";

type ExecutionLogsPanelProps = {
  workflowId: string;
  selectedRunId?: string | null;
};

const RUN_STATUSES: WorkflowRunStatus[] = [
  "RUNNING",
  "WAITING",
  "COMPLETED",
  "FAILED",
  "CANCELLED",
];

function stepStatusVariant(
  status: string,
): "default" | "secondary" | "outline" | "destructive" {
  if (status === "COMPLETED") return "default";
  if (status === "FAILED") return "destructive";
  if (status === "WAITING") return "secondary";
  return "outline";
}

function JsonBlock({ value }: { value: unknown }) {
  if (value == null) {
    return <span className="text-muted-foreground">—</span>;
  }
  return (
    <pre className="max-h-48 overflow-auto rounded-md bg-muted p-2 text-xs">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

export function ExecutionLogsPanel({
  workflowId,
  selectedRunId,
}: ExecutionLogsPanelProps) {
  const [contactId, setContactId] = useState("");
  const [status, setStatus] = useState<WorkflowRunStatus | "all">("all");
  const [activeRunId, setActiveRunId] = useState<string | null>(
    selectedRunId ?? null,
  );

  const filters = useMemo(
    () => ({
      workflowId,
      limit: 30,
      ...(contactId.trim() ? { contactId: contactId.trim() } : {}),
      ...(status !== "all" ? { status } : {}),
    }),
    [workflowId, contactId, status],
  );

  const { data, isLoading } = useAutomationWorkflowRuns(filters);

  const selectedRun = useMemo(() => {
    const runs = data?.items ?? [];
    if (activeRunId) {
      return runs.find((run) => run.id === activeRunId) ?? runs[0] ?? null;
    }
    return runs[0] ?? null;
  }, [data?.items, activeRunId]);

  const columns = useMemo<DataTableColumn<AutomationWorkflowRun>[]>(
    () => [
      {
        id: "startedAt",
        header: "Run",
        cell: (row) => (
          <button
            type="button"
            className={cn(
              "text-left text-sm hover:underline",
              selectedRun?.id === row.id && "font-medium text-primary",
            )}
            onClick={() => setActiveRunId(row.id)}
          >
            {new Date(row.startedAt).toLocaleString()}
          </button>
        ),
      },
      {
        id: "status",
        header: "Status",
        cell: (row) => <Badge variant="outline">{row.status}</Badge>,
      },
      {
        id: "steps",
        header: "Steps",
        cell: (row) => row.steps.length,
      },
      {
        id: "error",
        header: "Error",
        cell: (row) => (
          <span className="text-xs text-destructive">
            {row.errorMessage ?? ""}
          </span>
        ),
      },
    ],
    [selectedRun?.id],
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-4 rounded-lg border p-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Contact ID</Label>
          <Input
            value={contactId}
            onChange={(e) => setContactId(e.target.value)}
            placeholder="Filter runs by contact UUID"
          />
        </div>
        <div className="space-y-2">
          <Label>Run status</Label>
          <Select
            value={status}
            onValueChange={(value) =>
              setStatus(value as WorkflowRunStatus | "all")
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{FILTER_ALL_LABELS.statuses}</SelectItem>
              {RUN_STATUSES.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {!isLoading && (data?.items.length ?? 0) === 0 ? (
        <EmptyState
          title="No execution logs yet"
          description="Step-by-step execution details appear after workflow runs complete."
        />
      ) : (
        <>
          <DataTable
            columns={columns}
            data={data?.items ?? []}
            getRowId={(row) => row.id}
            isLoading={isLoading}
          />

          {selectedRun ? (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  Run timeline — {new Date(selectedRun.startedAt).toLocaleString()}
                </CardTitle>
                {selectedRun.errorMessage ? (
                  <p className="text-sm text-destructive">
                    {selectedRun.errorMessage}
                  </p>
                ) : null}
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedRun.steps.map((step) => (
                  <div key={step.id} className="rounded-lg border p-4">
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">
                        Step {step.stepIndex + 1}
                      </span>
                      <Badge variant={stepStatusVariant(step.status)}>
                        {step.status}
                      </Badge>
                      <span className="font-mono text-xs text-muted-foreground">
                        {step.actionKey}
                      </span>
                      {step.scheduledFor ? (
                        <span className="text-xs text-muted-foreground">
                          Scheduled:{" "}
                          {new Date(step.scheduledFor).toLocaleString()}
                        </span>
                      ) : null}
                    </div>
                    {step.errorMessage ? (
                      <p className="mb-2 text-sm text-destructive">
                        {step.errorMessage}
                      </p>
                    ) : null}
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">
                          Input
                        </p>
                        <JsonBlock value={step.input} />
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">
                          Output
                        </p>
                        <JsonBlock value={step.output} />
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}
        </>
      )}
    </div>
  );
}
