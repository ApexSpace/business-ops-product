"use client";



import { useEffect, useState } from "react";

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

import { Switch } from "@/components/ui/switch";

import type { WorkflowSettings } from "@/features/automations/types/workflow";



type WorkflowSettingsPanelProps = {

  settings: WorkflowSettings;

  onSave: (settings: WorkflowSettings) => void;

  isSaving?: boolean;

};



const RUN_POLICIES: Array<{

  value: NonNullable<WorkflowSettings["runPolicy"]>;

  label: string;

}> = [

  { value: "every_time", label: "Every time" },

  { value: "once_per_context", label: "Once per context" },

  { value: "once_per_subject", label: "Once per contact" },

  { value: "once_per_period", label: "Once per period" },

];



export function WorkflowSettingsPanel({

  settings,

  onSave,

  isSaving,

}: WorkflowSettingsPanelProps) {

  const [draft, setDraft] = useState<WorkflowSettings>(settings);



  useEffect(() => {

    setDraft(settings);

  }, [settings]);



  return (

    <Card>

      <CardHeader>

        <CardTitle className="text-base">Workflow settings</CardTitle>

      </CardHeader>

      <CardContent className="space-y-6">

        <div className="flex items-center justify-between gap-4">

          <div className="space-y-1">

            <Label>Allow re-entry</Label>

            <p className="text-xs text-muted-foreground">

              Let the same contact enroll again after a run completes.

            </p>

          </div>

          <Switch

            checked={draft.allowReentry ?? false}

            onCheckedChange={(allowReentry) =>

              setDraft((prev) => ({ ...prev, allowReentry }))

            }

          />

        </div>



        <div className="flex items-center justify-between gap-4">

          <div className="space-y-1">

            <Label>Allow multiple contexts</Label>

            <p className="text-xs text-muted-foreground">

              Run separately for each related record (appointment, invoice, etc.).

            </p>

          </div>

          <Switch

            checked={draft.allowMultipleContexts ?? true}

            onCheckedChange={(allowMultipleContexts) =>

              setDraft((prev) => ({ ...prev, allowMultipleContexts }))

            }

          />

        </div>



        <div className="flex items-center justify-between gap-4">

          <div className="space-y-1">

            <Label>Stop on response</Label>

            <p className="text-xs text-muted-foreground">

              End the run when the contact replies in a conversation.

            </p>

          </div>

          <Switch

            checked={draft.stopOnResponse ?? false}

            onCheckedChange={(stopOnResponse) =>

              setDraft((prev) => ({ ...prev, stopOnResponse }))

            }

          />

        </div>



        <div className="space-y-2">

          <Label>Run policy</Label>

          <Select

            value={draft.runPolicy ?? "once_per_context"}

            onValueChange={(runPolicy) =>

              setDraft((prev) => ({

                ...prev,

                runPolicy: runPolicy as WorkflowSettings["runPolicy"],

              }))

            }

          >

            <SelectTrigger>

              <SelectValue />

            </SelectTrigger>

            <SelectContent>

              {RUN_POLICIES.map((policy) => (

                <SelectItem key={policy.value} value={policy.value}>

                  {policy.label}

                </SelectItem>

              ))}

            </SelectContent>

          </Select>

        </div>



        {draft.runPolicy === "once_per_period" ? (

          <div className="space-y-2">

            <Label>Period (days)</Label>

            <Input

              type="number"

              min={1}

              value={draft.runPolicyPeriodDays ?? 30}

              onChange={(e) =>

                setDraft((prev) => ({

                  ...prev,

                  runPolicyPeriodDays: Number(e.target.value) || 30,

                }))

              }

            />

          </div>

        ) : null}



        <div className="flex items-center justify-between gap-4">

          <div className="space-y-1">

            <Label>Send time window</Label>

            <p className="text-xs text-muted-foreground">

              Delay email steps until the next allowed window.

            </p>

          </div>

          <Switch

            checked={draft.timeWindowEnabled ?? false}

            onCheckedChange={(timeWindowEnabled) =>

              setDraft((prev) => ({ ...prev, timeWindowEnabled }))

            }

          />

        </div>



        {draft.timeWindowEnabled ? (

          <div className="grid gap-4 md:grid-cols-2">

            <div className="space-y-2">

              <Label>Window start (HH:mm)</Label>

              <Input

                value={draft.timeWindow?.start ?? "09:00"}

                onChange={(e) =>

                  setDraft((prev) => ({

                    ...prev,

                    timeWindow: {

                      start: e.target.value,

                      end: prev.timeWindow?.end ?? "17:00",

                    },

                  }))

                }

                placeholder="09:00"

              />

            </div>

            <div className="space-y-2">

              <Label>Window end (HH:mm)</Label>

              <Input

                value={draft.timeWindow?.end ?? "17:00"}

                onChange={(e) =>

                  setDraft((prev) => ({

                    ...prev,

                    timeWindow: {

                      start: prev.timeWindow?.start ?? "09:00",

                      end: e.target.value,

                    },

                  }))

                }

                placeholder="17:00"

              />

            </div>

          </div>

        ) : null}



        <div className="space-y-2">

          <Label>Timezone override</Label>

          <Input

            value={draft.timezone ?? ""}

            onChange={(e) =>

              setDraft((prev) => ({

                ...prev,

                timezone: e.target.value || null,

              }))

            }

            placeholder="America/New_York"

          />

        </div>



        <div className="grid gap-4 md:grid-cols-2">

          <div className="space-y-2">

            <Label>Sender name override</Label>

            <Input

              value={draft.senderFromName ?? ""}

              onChange={(e) =>

                setDraft((prev) => ({

                  ...prev,

                  senderFromName: e.target.value || null,

                }))

              }

              placeholder="Business default"

            />

          </div>

          <div className="space-y-2">

            <Label>Sender email override</Label>

            <Input

              type="email"

              value={draft.senderFromEmail ?? ""}

              onChange={(e) =>

                setDraft((prev) => ({

                  ...prev,

                  senderFromEmail: e.target.value || null,

                }))

              }

              placeholder="Business default"

            />

          </div>

          <div className="space-y-2 md:col-span-2">

            <Label>Sender number override</Label>

            <Input

              value={draft.senderFromNumber ?? ""}

              onChange={(e) =>

                setDraft((prev) => ({

                  ...prev,

                  senderFromNumber: e.target.value || null,

                }))

              }

              placeholder="For future SMS actions"

            />

          </div>

        </div>



        <div className="flex justify-end">

          <Button variant="brand" disabled={isSaving} onClick={() => onSave(draft)}>

            Save settings

          </Button>

        </div>

      </CardContent>

    </Card>

  );

}

