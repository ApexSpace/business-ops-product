"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { LoadingState } from "@/components/data-display/loading-state";
import { RichTextEditor } from "@/components/forms/rich-text-editor";
import { SettingsFormPage } from "@/components/layout/settings-page-layout";
import { SettingsInlineEditSection } from "@/components/layout/settings-inline-edit-section";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { PERMISSIONS, useCan } from "@/features/auth/permissions";
import {
  updateCancellationPolicy,
  updateLateCancellation,
  updateSelfServiceSettings,
  type CancelRescheduleSettings,
} from "@/features/cancel-reschedule-settings/api/cancel-reschedule-settings.api";
import { useCancelRescheduleSettings } from "@/features/cancel-reschedule-settings/hooks/use-cancel-reschedule-settings";
import {
  decodeSelfCancellationValue,
  decodeSelfRescheduleValue,
  encodeSelfCancellationValue,
  encodeSelfRescheduleValue,
  formatLateCancellationSummary,
  formatSelfCancellationSummary,
  formatSelfRescheduleSummary,
  LATE_CANCELLATION_OPTIONS,
  SELF_CANCELLATION_OPTIONS,
  SELF_RESCHEDULE_OPTIONS,
  stripHtmlToPlainText,
} from "@/features/cancel-reschedule-settings/utils/self-service-labels";
import { invalidateCancelRescheduleSettings } from "@/lib/query/invalidation";
import { SETTINGS_FORM_SECTION_STACK_CLASS } from "@/lib/design/settings-form-tokens";

const SMS_MAX = 215;

function useSectionDraft<T>(
  source: CancelRescheduleSettings | undefined,
  pick: (data: CancelRescheduleSettings) => T,
) {
  const [draft, setDraft] = useState<T | null>(null);

  useEffect(() => {
    if (source) setDraft(pick(source));
  }, [source, pick]);

  const saved = source ? pick(source) : null;
  const values = draft ?? saved;
  const isDirty =
    saved != null &&
    values != null &&
    JSON.stringify(values) !== JSON.stringify(saved);

  const reset = useCallback(() => {
    if (saved) setDraft(saved);
  }, [saved]);

  return { values, isDirty, reset, setDraft };
}

export function CancelRescheduleSettingsScreen() {
  const queryClient = useQueryClient();
  const canEdit = useCan(PERMISSIONS["settings.business"]);
  const { data, isLoading, isError, error } = useCancelRescheduleSettings();

  const policyPick = useCallback(
    (settings: CancelRescheduleSettings) => ({
      cancellationPolicyHtml: settings.cancellationPolicyHtml ?? "",
      cancellationPolicySms: settings.cancellationPolicySms ?? "",
      requirePolicyAgreement: settings.requirePolicyAgreement,
    }),
    [],
  );
  const selfServicePick = useCallback(
    (settings: CancelRescheduleSettings) => ({
      selfCancellationValue: encodeSelfCancellationValue(settings),
      selfRescheduleValue: encodeSelfRescheduleValue(settings),
    }),
    [],
  );
  const latePick = useCallback(
    (settings: CancelRescheduleSettings) => ({
      lateCancellationHoursBefore: settings.lateCancellationHoursBefore,
    }),
    [],
  );

  const policy = useSectionDraft(data, policyPick);
  const selfService = useSectionDraft(data, selfServicePick);
  const late = useSectionDraft(data, latePick);

  const [editingSection, setEditingSection] = useState<
    "policy" | "self-service" | "late" | null
  >(null);

  const mutation = useMutation({
    mutationFn: async (action: () => Promise<CancelRescheduleSettings>) =>
      action(),
    onSuccess: async () => {
      await invalidateCancelRescheduleSettings(queryClient);
      toast.success("Cancel & reschedule settings saved");
      setEditingSection(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const policySummary = useMemo(() => {
    if (!data) return null;
    const html = data.cancellationPolicyHtml?.trim();
    const sms = data.cancellationPolicySms?.trim();
    return (
      <div className="space-y-2">
        <p>
          {html
            ? stripHtmlToPlainText(html).slice(0, 180) +
              (stripHtmlToPlainText(html).length > 180 ? "…" : "")
            : "No email or online booking policy set"}
        </p>
        {sms ? (
          <p className="text-muted-foreground">
            SMS: {sms} ({sms.length}/{SMS_MAX})
          </p>
        ) : (
          <p className="text-muted-foreground">No SMS policy set</p>
        )}
        {data.requirePolicyAgreement ? (
          <p className="text-muted-foreground">
            Clients must agree to the policy when booking
          </p>
        ) : null}
      </div>
    );
  }, [data]);

  if (isLoading) {
    return <LoadingState label="Loading cancel & reschedule settings…" />;
  }

  if (isError || !data) {
    return (
      <p className="text-sm text-destructive">
        {error instanceof Error
          ? error.message
          : "Could not load cancel & reschedule settings"}
      </p>
    );
  }

  return (
    <SettingsFormPage
      title="Cancel & Reschedule"
      description="Configure cancellation policy, client self-service, and late cancellation reporting."
    >
      <div className={SETTINGS_FORM_SECTION_STACK_CLASS}>
        <SettingsInlineEditSection
          title="Cancellation Policy"
          description="Shown during online booking and available in confirmation and reminder messages."
          summary={policySummary}
          isEditing={editingSection === "policy"}
          onEdit={() => setEditingSection("policy")}
          onDiscard={() => {
            policy.reset();
            setEditingSection(null);
          }}
          onSave={() => {
            const values = policy.values;
            if (!values) return;
            if (values.cancellationPolicySms.length > SMS_MAX) {
              toast.error(`SMS policy must be ${SMS_MAX} characters or fewer`);
              return;
            }
            mutation.mutate(() =>
              updateCancellationPolicy({
                cancellationPolicyHtml:
                  values.cancellationPolicyHtml.trim() || null,
                cancellationPolicySms:
                  values.cancellationPolicySms.trim() || null,
                requirePolicyAgreement: values.requirePolicyAgreement,
              }),
            );
          }}
          isDirty={policy.isDirty}
          isSaving={mutation.isPending}
          disabled={!canEdit}
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>For emails & online booking</Label>
              <RichTextEditor
                value={policy.values?.cancellationPolicyHtml ?? ""}
                onChange={(html) =>
                  policy.setDraft((current) =>
                    current
                      ? { ...current, cancellationPolicyHtml: html }
                      : current,
                  )
                }
                disabled={!canEdit || mutation.isPending}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="cancellation-policy-sms">For text messages</Label>
                <span className="text-xs text-muted-foreground">
                  {(policy.values?.cancellationPolicySms ?? "").length} / {SMS_MAX}
                </span>
              </div>
              <Textarea
                id="cancellation-policy-sms"
                rows={3}
                maxLength={SMS_MAX}
                value={policy.values?.cancellationPolicySms ?? ""}
                onChange={(event) =>
                  policy.setDraft((current) =>
                    current
                      ? {
                          ...current,
                          cancellationPolicySms: event.target.value,
                        }
                      : current,
                  )
                }
                disabled={!canEdit || mutation.isPending}
              />
            </div>
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-1">
                <Label htmlFor="require-policy-agreement">
                  Require policy agreement
                </Label>
                <p className="text-sm text-muted-foreground">
                  Clients must check a box agreeing to the policy when booking
                  online.
                </p>
              </div>
              <Switch
                id="require-policy-agreement"
                checked={policy.values?.requirePolicyAgreement ?? false}
                onCheckedChange={(checked) =>
                  policy.setDraft((current) =>
                    current
                      ? { ...current, requirePolicyAgreement: checked }
                      : current,
                  )
                }
                disabled={!canEdit || mutation.isPending}
              />
            </div>
          </div>
        </SettingsInlineEditSection>

        <SettingsInlineEditSection
          title="Client Self-Service"
          description="Let clients cancel or reschedule from a link in automated messages."
          summary={
            <div className="space-y-1">
              <p>
                Self-cancellation:{" "}
                {formatSelfCancellationSummary(data)}
              </p>
              <p className="text-muted-foreground">
                Self-rescheduling: {formatSelfRescheduleSummary(data)}
              </p>
            </div>
          }
          isEditing={editingSection === "self-service"}
          onEdit={() => setEditingSection("self-service")}
          onDiscard={() => {
            selfService.reset();
            setEditingSection(null);
          }}
          onSave={() => {
            if (!selfService.values) return;
            const cancel = decodeSelfCancellationValue(
              selfService.values.selfCancellationValue,
            );
            const reschedule = decodeSelfRescheduleValue(
              selfService.values.selfRescheduleValue,
            );
            mutation.mutate(() =>
              updateSelfServiceSettings({
                selfCancellationMode: cancel.selfCancellationMode,
                selfCancellationMinutes: 15,
                ...(cancel.selfCancellationHoursBefore !== undefined
                  ? {
                      selfCancellationHoursBefore:
                        cancel.selfCancellationHoursBefore,
                    }
                  : {}),
                selfRescheduleMode: reschedule.selfRescheduleMode,
                ...(reschedule.selfRescheduleHoursBefore !== undefined
                  ? {
                      selfRescheduleHoursBefore:
                        reschedule.selfRescheduleHoursBefore,
                    }
                  : {}),
              }),
            );
          }}
          isDirty={selfService.isDirty}
          isSaving={mutation.isPending}
          disabled={!canEdit}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Allow self-cancellations</Label>
              <Select
                value={selfService.values?.selfCancellationValue ?? "DISABLED"}
                onValueChange={(value) => {
                  if (value == null) return;
                  selfService.setDraft((current) =>
                    current
                      ? { ...current, selfCancellationValue: value }
                      : current,
                  );
                }}
                disabled={!canEdit || mutation.isPending}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SELF_CANCELLATION_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Allow self-rescheduling</Label>
              <Select
                value={selfService.values?.selfRescheduleValue ?? "DISABLED"}
                onValueChange={(value) => {
                  if (value == null) return;
                  selfService.setDraft((current) =>
                    current
                      ? { ...current, selfRescheduleValue: value }
                      : current,
                  );
                }}
                disabled={!canEdit || mutation.isPending}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SELF_RESCHEDULE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </SettingsInlineEditSection>

        <SettingsInlineEditSection
          title="Late Cancellations"
          description="When staff cancel an appointment, classify it as late if within this window."
          summary={formatLateCancellationSummary(data.lateCancellationHoursBefore)}
          isEditing={editingSection === "late"}
          onEdit={() => setEditingSection("late")}
          onDiscard={() => {
            late.reset();
            setEditingSection(null);
          }}
          onSave={() => {
            const values = late.values;
            if (!values) return;
            mutation.mutate(() =>
              updateLateCancellation({
                lateCancellationHoursBefore:
                  values.lateCancellationHoursBefore,
              }),
            );
          }}
          isDirty={late.isDirty}
          isSaving={mutation.isPending}
          disabled={!canEdit}
        >
          <div className="space-y-2">
            <Label>Late cancellation window</Label>
            <Select
              value={String(late.values?.lateCancellationHoursBefore ?? 24)}
              onValueChange={(value) =>
                late.setDraft((current) =>
                  current
                    ? {
                        ...current,
                        lateCancellationHoursBefore: Number(value),
                      }
                    : current,
                )
              }
              disabled={!canEdit || mutation.isPending}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LATE_CANCELLATION_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </SettingsInlineEditSection>
      </div>
    </SettingsFormPage>
  );
}
