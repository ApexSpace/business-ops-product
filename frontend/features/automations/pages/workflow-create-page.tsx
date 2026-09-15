"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/layout/page-header";
import { useAutomationsHost } from "@/features/automations/automations-host-context";
import { TriggerPicker } from "@/features/automations/components/trigger-picker";
import { useAutomationWorkflowMutations } from "@/features/automations/hooks/use-automation-workflows";

export function WorkflowCreatePage() {
  const router = useRouter();
  const { basePath, workflowsBasePath } = useAutomationsHost();
  const { createMutation } = useAutomationWorkflowMutations();
  const [name, setName] = useState("");
  const [triggerKey, setTriggerKey] = useState<string | null>(null);

  const handleCreate = () => {
    if (!name.trim() || !triggerKey) return;
    createMutation.mutate(
      {
        name: name.trim(),
        triggerKey,
        steps: [
          {
            id: crypto.randomUUID(),
            actionKey: "workflow.end",
            config: {},
          },
        ],
      },
      {
        onSuccess: (workflow) => {
          router.push(`${workflowsBasePath}/${workflow.id}`);
        },
      },
    );
  };

  return (
    <div className="space-y-6">
      <Button
        variant="ghost"
        size="sm"
        nativeButton={false}
        render={<Link href={basePath} />}
      >
        <ArrowLeft className="mr-1 size-4" />
        Back to workflows
      </Button>

      <PageHeader
        title="Create workflow"
        description="Choose a name and trigger to start building your automation."
      />

      <div className="max-w-xl space-y-4">
        <div className="space-y-2">
          <Label htmlFor="workflow-name">Name</Label>
          <Input
            id="workflow-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="New contact welcome"
          />
        </div>
        <div className="space-y-2">
          <Label>Trigger</Label>
          <TriggerPicker value={triggerKey} onValueChange={setTriggerKey} />
        </div>
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href={basePath} />}
          >
            Cancel
          </Button>
          <Button
            variant="brand"
            disabled={!name.trim() || !triggerKey || createMutation.isPending}
            onClick={handleCreate}
          >
            Create workflow
          </Button>
        </div>
      </div>
    </div>
  );
}
