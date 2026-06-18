"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TriggerPicker } from "@/features/automations/components/trigger-picker";
import { useAutomationWorkflowMutations } from "@/features/automations/hooks/use-automation-workflows";

type WorkflowCreateDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function WorkflowCreateDialog({
  open,
  onOpenChange,
}: WorkflowCreateDialogProps) {
  const router = useRouter();
  const { createMutation } = useAutomationWorkflowMutations();
  const [name, setName] = useState("");
  const [triggerKey, setTriggerKey] = useState<string | null>(null);

  const reset = () => {
    setName("");
    setTriggerKey(null);
  };

  const handleCreate = async () => {
    if (!name.trim() || !triggerKey) return;
    const workflow = await createMutation.mutateAsync({
      name: name.trim(),
      triggerKey,
      steps: [
        {
          id: crypto.randomUUID(),
          actionKey: "workflow.end",
          config: {},
        },
      ],
    });
    reset();
    onOpenChange(false);
    router.push(`/business/settings/automation-workflows/${workflow.id}`);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create workflow</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
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
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!name.trim() || !triggerKey || createMutation.isPending}
            onClick={handleCreate}
          >
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
