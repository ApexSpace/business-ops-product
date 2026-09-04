"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { LoadingState } from "@/components/data-display/loading-state";
import { SettingsInlineEditSection } from "@/components/layout/settings-inline-edit-section";
import { SettingsViewRows } from "@/components/layout/settings-view-rows";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  getTeamMemberCompensation,
  updateTeamMemberCompensation,
  type StaffCompensation,
} from "@/features/team/api/team.api";
import { DRAWER_SWITCH_CLASS } from "@/lib/design/drawer-tokens";
import {
  SETTINGS_FORM_DESCRIPTION_CLASS,
  SETTINGS_FORM_SECTION_STACK_CLASS,
} from "@/lib/design/settings-form-tokens";
import { useSettingsSectionEdit } from "@/lib/settings/use-settings-section-edit";
import { queryKeys } from "@/lib/query/keys";
import { cn } from "@/lib/utils";

type Props = {
  userId: string;
  role: string;
  canManage: boolean;
};

const emptyForm: StaffCompensation = {
  serviceCommissionEnabled: false,
  serviceCommissionMode: null,
  serviceCommissionPercent: null,
  productCommissionEnabled: false,
  productCommissionPercent: null,
  productCommissionOverridesEnabled: false,
  hourlyEnabled: false,
  hourlyRate: null,
  greaterOfEnabled: false,
};

function yesNo(value: boolean): string {
  return value ? "Yes" : "No";
}

export function MemberCompensationTab({ userId, role, canManage }: Props) {
  const queryClient = useQueryClient();
  const isAdmin = role === "ADMIN" || role === "OWNER";
  const { isEditing, startEdit, stopEdit } =
    useSettingsSectionEdit<"compensation">();

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.business.memberCompensation(userId),
    queryFn: () => getTeamMemberCompensation(userId),
  });

  const [form, setForm] = useState<StaffCompensation>(emptyForm);
  const [baseline, setBaseline] = useState("");

  useEffect(() => {
    if (!data) return;
    setForm(data);
    setBaseline(JSON.stringify(data));
    stopEdit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: () => updateTeamMemberCompensation(userId, form),
    onSuccess: () => {
      toast.success("Compensation saved");
      stopEdit();
      void queryClient.invalidateQueries({
        queryKey: queryKeys.business.memberCompensation(userId),
      });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading) {
    return <LoadingState variant="inline" />;
  }

  if (isAdmin) {
    return (
      <p className="text-sm text-muted-foreground">
        Compensation settings apply to Normal staff members only.
      </p>
    );
  }

  const isDirty = JSON.stringify(form) !== baseline;

  const summaryRows = [
    {
      label: "Service commission",
      value: form.serviceCommissionEnabled
        ? `${form.serviceCommissionPercent ?? 0}%`
        : "Off",
    },
    {
      label: "Product commission",
      value: form.productCommissionEnabled
        ? `${form.productCommissionPercent ?? 0}%`
        : "Off",
    },
    {
      label: "Product overrides",
      value: yesNo(form.productCommissionOverridesEnabled),
    },
    {
      label: "Hourly rate",
      value: form.hourlyEnabled
        ? form.hourlyRate != null
          ? String(form.hourlyRate)
          : "Enabled"
        : "Off",
    },
    {
      label: "Greater-of calculation",
      value: yesNo(form.greaterOfEnabled),
    },
  ];

  return (
    <div className={cn(SETTINGS_FORM_SECTION_STACK_CLASS, "max-w-3xl")}>
      <SettingsInlineEditSection
        title="Compensation"
        summary={<SettingsViewRows rows={summaryRows} />}
        isEditing={isEditing("compensation")}
        onEdit={() => startEdit("compensation")}
        onDiscard={() => {
          if (data) {
            setForm(data);
            setBaseline(JSON.stringify(data));
          }
          stopEdit();
        }}
        onSave={() => saveMutation.mutate()}
        isDirty={isDirty}
        isSaving={saveMutation.isPending}
        disabled={!canManage}
      >
        <div className="space-y-6">
          <CompensationBlock
            title="Service commission"
            description="Basic percentage of service sales."
            enabled={form.serviceCommissionEnabled}
            onEnabledChange={(serviceCommissionEnabled) =>
              setForm({ ...form, serviceCommissionEnabled })
            }
            disabled={!canManage}
          >
            <NumberField
              label="Default percentage"
              value={form.serviceCommissionPercent}
              disabled={!canManage || !form.serviceCommissionEnabled}
              onChange={(serviceCommissionPercent) =>
                setForm({ ...form, serviceCommissionPercent })
              }
            />
          </CompensationBlock>

          <CompensationBlock
            title="Product commission"
            enabled={form.productCommissionEnabled}
            onEnabledChange={(productCommissionEnabled) =>
              setForm({ ...form, productCommissionEnabled })
            }
            disabled={!canManage}
          >
            <NumberField
              label="Default percentage"
              value={form.productCommissionPercent}
              disabled={!canManage || !form.productCommissionEnabled}
              onChange={(productCommissionPercent) =>
                setForm({ ...form, productCommissionPercent })
              }
            />
            <ToggleRow
              label="Enable commission overrides"
              checked={form.productCommissionOverridesEnabled}
              disabled={!canManage || !form.productCommissionEnabled}
              onCheckedChange={(productCommissionOverridesEnabled) =>
                setForm({ ...form, productCommissionOverridesEnabled })
              }
            />
          </CompensationBlock>

          <CompensationBlock
            title="Hourly"
            enabled={form.hourlyEnabled}
            onEnabledChange={(hourlyEnabled) =>
              setForm({ ...form, hourlyEnabled })
            }
            disabled={!canManage}
          >
            <NumberField
              label="Amount per hour"
              value={form.hourlyRate}
              disabled={!canManage || !form.hourlyEnabled}
              onChange={(hourlyRate) => setForm({ ...form, hourlyRate })}
            />
            <ToggleRow
              label="Enable greater-of calculation"
              checked={form.greaterOfEnabled}
              disabled={!canManage || !form.hourlyEnabled}
              onCheckedChange={(greaterOfEnabled) =>
                setForm({ ...form, greaterOfEnabled })
              }
            />
          </CompensationBlock>
        </div>
      </SettingsInlineEditSection>
    </div>
  );
}

function CompensationBlock({
  title,
  description,
  enabled,
  onEnabledChange,
  disabled,
  children,
}: {
  title: string;
  description?: string;
  enabled: boolean;
  onEnabledChange: (value: boolean) => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4 border-b border-border/60 pb-6 last:border-b-0 last:pb-0">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-semibold text-violet-primary-dark">
            {title}
          </p>
          {description ? (
            <p className={SETTINGS_FORM_DESCRIPTION_CLASS}>{description}</p>
          ) : null}
        </div>
        <Switch
          checked={enabled}
          disabled={disabled}
          onCheckedChange={onEnabledChange}
          className={DRAWER_SWITCH_CLASS}
        />
      </div>
      {children}
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input
        type="number"
        min={0}
        disabled={disabled}
        value={value ?? ""}
        onChange={(e) =>
          onChange(e.target.value ? Number(e.target.value) : null)
        }
      />
    </div>
  );
}

function ToggleRow({
  label,
  checked,
  onCheckedChange,
  disabled,
}: {
  label: string;
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <Label className="font-normal">{label}</Label>
      <Switch
        checked={checked}
        disabled={disabled}
        onCheckedChange={onCheckedChange}
        className={DRAWER_SWITCH_CLASS}
      />
    </div>
  );
}
