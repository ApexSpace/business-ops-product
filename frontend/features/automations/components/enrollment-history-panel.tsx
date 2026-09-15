"use client";

import { useMemo, useState } from "react";
import {
  DataTable,
  type DataTableColumn,
} from "@/components/data-display/data-table";
import { EmptyState } from "@/components/data-display/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { FILTER_ALL_LABELS } from "@/lib/ui/filter-labels";

type EnrollmentHistoryPanelProps = {
  workflowId: string;
  triggerKey: string;
  onSelectRun?: (runId: string) => void;
};

const RUN_STATUSES: WorkflowRunStatus[] = [
  "RUNNING",
  "WAITING",
  "COMPLETED",
  "FAILED",
  "CANCELLED",
];

function runStatusVariant(
  status: WorkflowRunStatus,
): "default" | "secondary" | "outline" | "destructive" {
  if (status === "COMPLETED") return "default";
  if (status === "FAILED") return "destructive";
  if (status === "WAITING") return "secondary";
  return "outline";
}

export function EnrollmentHistoryPanel({
  workflowId,
  triggerKey,
  onSelectRun,
}: EnrollmentHistoryPanelProps) {
  const [contactId, setContactId] = useState("");
  const [status, setStatus] = useState<WorkflowRunStatus | "all">("all");
  const [startedAfter, setStartedAfter] = useState("");
  const [startedBefore, setStartedBefore] = useState("");

  const filters = useMemo(
    () => ({
      workflowId,
      limit: 50,
      ...(contactId.trim() ? { contactId: contactId.trim() } : {}),
      ...(status !== "all" ? { status } : {}),
      ...(startedAfter ? { startedAfter: new Date(startedAfter).toISOString() } : {}),
      ...(startedBefore
        ? { startedBefore: new Date(startedBefore).toISOString(),
}
        : {}),
    }),
    [workflowId, contactId, status, startedAfter, startedBefore],
  );

  const { data, isLoading, refetch } = useAutomationWorkflowRuns(filters);

  const columns = useMemo<DataTableColumn<AutomationWorkflowRun>[]>(
    () => [
      {
        id: "startedAt",
        header: "Enrolled",
        cell: (row) => new Date(row.startedAt).toLocaleString(),
      },
      {
        id: "status",
        header: "Status",
        cell: (row) => (
          <Badge variant={runStatusVariant(row.status)}>{row.status}</Badge>
        ),
      },
      {
        id: "contact",
        header: "Contact",
        cell: (row) => (
          <span className="font-mono text-xs">
            {row.contactId ?? row.subjectId}
          </span>
        ),
      },
      {
        id: "trigger",
        header: "Trigger",
        cell: (row) => (
          <span className="font-mono text-xs">{row.triggerKey}</span>
        ),
      },
      {
        id: "reason",
        header: "Reason",
        cell: (row) => (
          <span className="text-xs text-muted-foreground">
            {row.enrollmentReason ?? ""}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: (row) =>
          onSelectRun ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => onSelectRun(row.id)}
            >
              View log
            </Button>
          ) : null,
      },
    ],
    [onSelectRun],
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-4 rounded-lg border p-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-2">
          <Label>Contact ID</Label>
          <Input
            value={contactId}
            onChange={(e) => setContactId(e.target.value)}
            placeholder="Filter by contact UUID"
          />
        </div>
        <div className="space-y-2">
          <Label>Status</Label>
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
        <div className="space-y-2">
          <Label>From date</Label>
          <Input
            type="datetime-local"
            value={startedAfter}
            onChange={(e) => setStartedAfter(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>To date</Label>
          <Input
            type="datetime-local"
            value={startedBefore}
            onChange={(e) => setStartedBefore(e.target.value)}
          />
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Trigger: <span className="font-mono">{triggerKey}</span>
        </p>
        <Button type="button" variant="outline" size="sm" onClick={() => refetch()}>
          Refresh
        </Button>
      </div>

      {!isLoading && (data?.items.length ?? 0) === 0 ? (
        <EmptyState
          title="No enrollments yet"
          description="Runs appear here after this workflow enrolls contacts or records."
        />
      ) : (
        <DataTable
          columns={columns}
          data={data?.items ?? []}
          getRowId={(row) => row.id}
          isLoading={isLoading}
        />
      )}
    </div>
  );
}
