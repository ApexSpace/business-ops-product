"use client";

import { useEffect, useState } from "react";
import { ArrowDown, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ActionPicker } from "@/features/automations/components/action-picker";
import { CustomValuePicker } from "@/features/automations/components/custom-value-picker";
import { TriggerPicker } from "@/features/automations/components/trigger-picker";
import type {
  AutomationWorkflow,
  WorkflowStep,
  WorkflowTriggerFilter,
} from "@/features/automations/types/workflow";
import { insertMergeTagAtCursor } from "@/features/automations/utils/insert-merge-tag.util";

type WorkflowBuilderProps = {
  workflow: AutomationWorkflow;
  onSave: (payload: {
    name: string;
    description?: string;
    triggerKey: string;
    triggerFilters: WorkflowTriggerFilter[];
    steps: WorkflowStep[];
  }) => void;
  isSaving?: boolean;
};

function defaultConfigForAction(actionKey: string): Record<string, unknown> {
  if (actionKey === "communication.send_email") {
    return {
      subject: "Hello {{contact.first_name}}",
      htmlBody: "<p>Hi {{contact.first_name}},</p>",
    };
  }
  if (actionKey === "workflow.delay") {
    return { amount: 1, unit: "hours" };
  }
  if (actionKey === "note.create") {
    return { body: "Automation note for {{contact.first_name}}" };
  }
  if (actionKey === "task.create") {
    return { title: "Follow up with {{contact.first_name}}" };
  }
  return {};
}

export function WorkflowBuilder({
  workflow,
  onSave,
  isSaving,
}: WorkflowBuilderProps) {
  const [name, setName] = useState(workflow.name);
  const [description, setDescription] = useState(workflow.description ?? "");
  const [triggerKey, setTriggerKey] = useState(workflow.triggerKey);
  const [triggerFilters] = useState<WorkflowTriggerFilter[]>(
    workflow.triggerFilters ?? [],
  );
  const [steps, setSteps] = useState<WorkflowStep[]>(workflow.steps);

  useEffect(() => {
    setName(workflow.name);
    setDescription(workflow.description ?? "");
    setTriggerKey(workflow.triggerKey);
    setSteps(workflow.steps);
  }, [workflow]);

  const updateStep = (index: number, patch: Partial<WorkflowStep>) => {
    setSteps((prev) =>
      prev.map((step, i) => (i === index ? { ...step, ...patch } : step)),
    );
  };

  const addStep = () => {
    setSteps((prev) => [
      ...prev.filter((s) => s.actionKey !== "workflow.end"),
      {
        id: crypto.randomUUID(),
        actionKey: "communication.send_email",
        config: defaultConfigForAction("communication.send_email"),
      },
      {
        id: crypto.randomUUID(),
        actionKey: "workflow.end",
        config: {},
      },
    ]);
  };

  const removeStep = (index: number) => {
    setSteps((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Workflow settings</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Trigger</Label>
            <TriggerPicker value={triggerKey} onValueChange={setTriggerKey} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Enrollment filters</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Trigger filters are saved with the workflow. Use the registry
            browser on the main automations page to prototype filter rules.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Steps</CardTitle>
          <Button type="button" variant="outline" size="sm" onClick={addStep}>
            <Plus className="mr-1 size-4" />
            Add step
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {steps.map((step, index) => (
            <div key={step.id} className="space-y-3">
              <div className="flex items-start gap-3 rounded-lg border p-4">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium">
                  {index + 1}
                </div>
                <div className="min-w-0 flex-1 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <ActionPicker
                      value={step.actionKey}
                      onValueChange={(actionKey) =>
                        updateStep(index, {
                          actionKey,
                          config: defaultConfigForAction(actionKey),
                        })
                      }
                    />
                    {step.actionKey !== "workflow.end" ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeStep(index)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    ) : null}
                  </div>

                  {step.actionKey === "communication.send_email" ||
                  step.actionKey === "communication.send_internal_email" ? (
                    <EmailStepConfig
                      config={step.config}
                      onChange={(config) => updateStep(index, { config })}
                    />
                  ) : null}

                  {step.actionKey === "workflow.delay" ? (
                    <DelayStepConfig
                      config={step.config}
                      onChange={(config) => updateStep(index, { config })}
                    />
                  ) : null}

                  {step.actionKey === "note.create" ? (
                    <TextStepConfig
                      label="Note body"
                      field="body"
                      config={step.config}
                      onChange={(config) => updateStep(index, { config })}
                    />
                  ) : null}

                  {step.actionKey === "task.create" ? (
                    <TextStepConfig
                      label="Task title"
                      field="title"
                      config={step.config}
                      onChange={(config) => updateStep(index, { config })}
                    />
                  ) : null}

                  {step.actionKey === "contact.add_tag" ? (
                    <div className="space-y-2">
                      <Label>Tag ID</Label>
                      <Input
                        value={String(step.config.tagId ?? "")}
                        onChange={(e) =>
                          updateStep(index, {
                            config: { ...step.config, tagId: e.target.value },
                          })
                        }
                        placeholder="Tag UUID"
                      />
                    </div>
                  ) : null}

                  {(step.actionKey === "lead.create" ||
                    step.actionKey === "lead.move_stage") && (
                    <div className="space-y-2">
                      <Label>Stage ID</Label>
                      <Input
                        value={String(step.config.stageId ?? "")}
                        onChange={(e) =>
                          updateStep(index, {
                            config: { ...step.config, stageId: e.target.value },
                          })
                        }
                        placeholder="Pipeline stage UUID"
                      />
                    </div>
                  )}
                </div>
              </div>
              {index < steps.length - 1 ? (
                <div className="flex justify-center text-muted-foreground">
                  <ArrowDown className="size-4" />
                </div>
              ) : null}
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          disabled={isSaving || !name.trim() || !triggerKey}
          onClick={() =>
            onSave({
              name: name.trim(),
              description: description.trim() || undefined,
              triggerKey,
              triggerFilters,
              steps,
            })
          }
        >
          Save workflow
        </Button>
      </div>
    </div>
  );
}

function EmailStepConfig({
  config,
  onChange,
}: {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}) {
  const subject = String(config.subject ?? "");
  const htmlBody = String(config.htmlBody ?? "");

  const insertTag = (
    field: "subject" | "htmlBody",
    mergeTag: string,
    el: HTMLInputElement | HTMLTextAreaElement | null,
  ) => {
    const value = field === "subject" ? subject : htmlBody;
    const { value: next, cursor } = insertMergeTagAtCursor(
      value,
      mergeTag,
      el?.selectionStart ?? value.length,
      el?.selectionEnd ?? value.length,
    );
    onChange({ ...config, [field]: next });
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(cursor, cursor);
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <Label>Email content</Label>
        <CustomValuePicker onInsert={(tag) => insertTag("htmlBody", tag, null)} />
      </div>
      <div className="space-y-2">
        <Label>Subject</Label>
        <Input
          value={subject}
          onChange={(e) => onChange({ ...config, subject: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label>HTML body</Label>
        <Textarea
          value={htmlBody}
          onChange={(e) => onChange({ ...config, htmlBody: e.target.value })}
          rows={5}
        />
      </div>
    </div>
  );
}

function DelayStepConfig({
  config,
  onChange,
}: {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-2">
        <Label>Amount</Label>
        <Input
          type="number"
          min={1}
          value={Number(config.amount ?? 1)}
          onChange={(e) =>
            onChange({ ...config, amount: Number(e.target.value) })
          }
        />
      </div>
      <div className="space-y-2">
        <Label>Unit</Label>
        <select
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={String(config.unit ?? "hours")}
          onChange={(e) => onChange({ ...config, unit: e.target.value })}
        >
          <option value="minutes">Minutes</option>
          <option value="hours">Hours</option>
          <option value="days">Days</option>
        </select>
      </div>
    </div>
  );
}

function TextStepConfig({
  label,
  field,
  config,
  onChange,
}: {
  label: string;
  field: string;
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}) {
  const value = String(config[field] ?? "");
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label>{label}</Label>
        <CustomValuePicker
          onInsert={(tag) =>
            onChange({ ...config, [field]: `${value}{{${tag}}}` })
          }
        />
      </div>
      <Textarea
        value={value}
        onChange={(e) => onChange({ ...config, [field]: e.target.value })}
        rows={3}
      />
    </div>
  );
}
