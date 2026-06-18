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
import { FilterBuilder } from "@/features/automations/components/filter-builder";
import { TriggerPicker } from "@/features/automations/components/trigger-picker";
import {
  useAutomationConditions,
  useAutomationFilterOperators,
  useAutomationTriggers,
} from "@/features/automations/hooks/use-automation-metadata";
import type {
  AutomationWorkflow,
  WorkflowStep,
  WorkflowTriggerFilter,
} from "@/features/automations/types/workflow";
import type {
  ConditionMetadata,
  FilterOperatorMetadata,
} from "@/features/automations/types/metadata";
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
      fromName: "{{business.name}}",
    };
  }
  if (actionKey === "workflow.delay") {
    return { amount: 1, unit: "hours" };
  }
  if (actionKey === "workflow.condition") {
    return {
      conditionKey: "contact.has_email",
      operator: "eq",
      value: true,
    };
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
  const [triggerFilters, setTriggerFilters] = useState<WorkflowTriggerFilter[]>(
    workflow.triggerFilters ?? [],
  );
  const [steps, setSteps] = useState<WorkflowStep[]>(workflow.steps);
  const { data: triggers } = useAutomationTriggers();
  const { data: conditions } = useAutomationConditions();
  const { data: operators } = useAutomationFilterOperators();

  const selectedTrigger = triggers?.find((trigger) => trigger.key === triggerKey);

  useEffect(() => {
    setName(workflow.name);
    setDescription(workflow.description ?? "");
    setTriggerKey(workflow.triggerKey);
    setTriggerFilters(workflow.triggerFilters ?? []);
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
          <CardTitle className="text-base">Workflow details</CardTitle>
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
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Enrollment filters</CardTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setTriggerFilters((prev) => [
                ...prev,
                { fieldKey: "", operator: "eq", value: "" },
              ])
            }
          >
            <Plus className="mr-1 size-4" />
            Add filter
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {triggerFilters.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No filters — every matching trigger event will enroll contacts.
            </p>
          ) : (
            triggerFilters.map((filter, index) => (
              <div
                key={`${filter.fieldKey}-${index}`}
                className="space-y-2 rounded-lg border p-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">Filter {index + 1}</p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      setTriggerFilters((prev) =>
                        prev.filter((_, i) => i !== index),
                      )
                    }
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
                <FilterBuilder
                  fields={selectedTrigger?.filterFields}
                  conditions={conditions}
                  operators={operators ?? []}
                  value={filter}
                  onChange={(next) =>
                    setTriggerFilters((prev) =>
                      prev.map((item, i) => (i === index ? next : item)),
                    )
                  }
                />
              </div>
            ))
          )}
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

                  {step.actionKey === "workflow.condition" ? (
                    <ConditionStepConfig
                      config={step.config}
                      steps={steps}
                      currentStepId={step.id}
                      conditions={conditions ?? []}
                      operators={operators ?? []}
                      onChange={(config) => updateStep(index, { config })}
                    />
                  ) : null}
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
  const fromName = String(config.fromName ?? "");

  const insertTag = (
    field: "subject" | "htmlBody" | "fromName",
    mergeTag: string,
    el: HTMLInputElement | HTMLTextAreaElement | null,
  ) => {
    const value =
      field === "subject"
        ? subject
        : field === "htmlBody"
          ? htmlBody
          : fromName;
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
        <Label>From name</Label>
        <Input
          value={fromName}
          onChange={(e) => onChange({ ...config, fromName: e.target.value })}
          placeholder="e.g. Acme Dental or {{business.name}}"
        />
        <p className="text-xs text-muted-foreground">
          Shown as the sender name in the recipient&apos;s inbox. Leave blank to
          use the workflow default.
        </p>
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

function ConditionStepConfig({
  config,
  steps,
  currentStepId,
  conditions,
  operators,
  onChange,
}: {
  config: Record<string, unknown>;
  steps: WorkflowStep[];
  currentStepId: string;
  conditions: ConditionMetadata[];
  operators: FilterOperatorMetadata[];
  onChange: (config: Record<string, unknown>) => void;
}) {
  const implementedConditions = conditions.filter(
    (item) => item.implementationStatus === "implemented",
  );
  const branchTargets = steps.filter(
    (step) => step.id !== currentStepId && step.actionKey !== "workflow.end",
  );

  return (
    <div className="grid gap-3">
      <div className="space-y-2">
        <Label>Condition</Label>
        <select
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={String(config.conditionKey ?? "")}
          onChange={(e) =>
            onChange({ ...config, conditionKey: e.target.value })
          }
        >
          <option value="">Select condition</option>
          {implementedConditions.map((condition) => (
            <option key={condition.key} value={condition.key}>
              {condition.label}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Operator</Label>
          <select
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={String(config.operator ?? "eq")}
            onChange={(e) => onChange({ ...config, operator: e.target.value })}
          >
            {operators.map((operator) => (
              <option key={operator.key} value={operator.key}>
                {operator.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label>Value</Label>
          <Input
            value={String(config.value ?? "")}
            onChange={(e) => onChange({ ...config, value: e.target.value })}
            placeholder="true, uuid, or text"
          />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>If true, go to step</Label>
          <select
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={String(config.trueBranchStepId ?? "")}
            onChange={(e) =>
              onChange({
                ...config,
                trueBranchStepId: e.target.value || undefined,
              })
            }
          >
            <option value="">Next step</option>
            {branchTargets.map((step, index) => (
              <option key={step.id} value={step.id}>
                Step {index + 1}: {step.actionKey}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label>If false, go to step</Label>
          <select
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={String(config.falseBranchStepId ?? "")}
            onChange={(e) =>
              onChange({
                ...config,
                falseBranchStepId: e.target.value || undefined,
              })
            }
          >
            <option value="">Continue / skip</option>
            {branchTargets.map((step, index) => (
              <option key={step.id} value={step.id}>
                Step {index + 1}: {step.actionKey}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
