"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { SelectField } from "@/components/forms/select-field";
import { CheckboxField } from "@/components/forms/checkbox-field";
import { TextField } from "@/components/forms/text-field";
import { Form, FormSchemaProvider } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { updatePlatformPlanGroupEmbed } from "@/features/platform/api/plan-groups.api";
import {
  planEmbedSchema,
  type PlanEmbedValues,
} from "@/features/platform/schemas/plan-group-form";
import type { PlanEmbedSettings, PlanGroupDetail } from "@/features/platform/types/plan-group";
import {
  getPricingEmbedCode,
  getPricingJsonUrl,
  getPublicBackendUrl,
} from "@/lib/config/public-backend-url";

export const PLAN_GROUP_EMBED_FORM_ID = "plan-group-embed-form";

type PlanGroupEmbedTabProps = {
  planGroup: PlanGroupDetail;
  embed: PlanEmbedSettings;
  canManage: boolean;
  onSaved: () => void;
};

const themeOptions = [
  { value: "LIGHT", label: "Light" },
  { value: "DARK", label: "Dark" },
  { value: "AUTO", label: "Auto" },
];

const layoutOptions = [
  { value: "CARDS", label: "Cards" },
  { value: "COMPARISON", label: "Comparison" },
];

export function PlanGroupEmbedTab({
  planGroup,
  embed,
  canManage,
  onSaved,
}: PlanGroupEmbedTabProps) {
  const publicUrl = getPublicBackendUrl();
  const embedCode = getPricingEmbedCode(planGroup.id);
  const jsonUrl = getPricingJsonUrl(planGroup.id);

  const form = useForm<PlanEmbedValues>({
    resolver: zodResolver(planEmbedSchema),
    defaultValues: {
      theme: embed.theme,
      layout: embed.layout,
      showMonthlyYearlyToggle: embed.showMonthlyYearlyToggle,
      showFeatureComparison: embed.showFeatureComparison,
      showSetupFee: embed.showSetupFee,
      showTrialDays: embed.showTrialDays,
      showCapabilities: embed.showCapabilities,
      showTierFeatures: embed.showTierFeatures,
      customCss: embed.customCss ?? "",
    },
  });

  useEffect(() => {
    form.reset({
      theme: embed.theme,
      layout: embed.layout,
      showMonthlyYearlyToggle: embed.showMonthlyYearlyToggle,
      showFeatureComparison: embed.showFeatureComparison,
      showSetupFee: embed.showSetupFee,
      showTrialDays: embed.showTrialDays,
      showCapabilities: embed.showCapabilities,
      showTierFeatures: embed.showTierFeatures,
      customCss: embed.customCss ?? "",
    });
  }, [embed, form]);

  const mutation = useMutation({
    mutationFn: (values: PlanEmbedValues) =>
      updatePlatformPlanGroupEmbed(planGroup.id, values),
    onSuccess: () => {
      toast.success("Embed settings saved");
      onSaved();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  async function copyText(text: string | null, label: string) {
    if (!text) {
      toast.error("Public backend URL is not configured");
      return;
    }
    await navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  }

  return (
    <div className="space-y-6">
      {!publicUrl ? (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-200">
          Set <code>BACKEND_URL</code> or <code>NEXT_PUBLIC_BACKEND_URL</code> in{" "}
          <code>frontend/.env</code> to display embed URLs and copy embed code.
        </div>
      ) : null}

      <Form {...form}>
        <FormSchemaProvider schema={planEmbedSchema}>
          <form
            id={PLAN_GROUP_EMBED_FORM_ID}
            className="grid max-w-2xl gap-4"
            onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
          >
            <SelectField
              control={form.control}
              name="theme"
              label="Theme"
              items={themeOptions}
              disabled={!canManage}
            />
            <SelectField
              control={form.control}
              name="layout"
              label="Layout"
              items={layoutOptions}
              disabled={!canManage}
            />
            <CheckboxField
              control={form.control}
              name="showMonthlyYearlyToggle"
              label="Monthly / yearly toggle"
              disabled={!canManage}
            />
            <CheckboxField
              control={form.control}
              name="showFeatureComparison"
              label="Feature comparison table"
              disabled={!canManage}
            />
            <CheckboxField
              control={form.control}
              name="showSetupFee"
              label="Show setup fee"
              disabled={!canManage}
            />
            <CheckboxField
              control={form.control}
              name="showTrialDays"
              label="Show trial days"
              disabled={!canManage}
            />
            <CheckboxField
              control={form.control}
              name="showCapabilities"
              label="Show capability chips"
              disabled={!canManage}
            />
            <CheckboxField
              control={form.control}
              name="showTierFeatures"
              label="Show tier feature bullets"
              disabled={!canManage}
            />
            <TextField
              control={form.control}
              name="customCss"
              label="Custom CSS"
              disabled={!canManage}
            />
          </form>
        </FormSchemaProvider>
      </Form>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-sm font-medium">Public JSON URL</p>
            <p className="text-xs text-muted-foreground break-all">
              {jsonUrl ?? "Not available"}
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => void copyText(jsonUrl, "JSON URL")}
          >
            <Copy className="mr-1 size-4" />
            Copy
          </Button>
        </div>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Embed code (script + iframe)</p>
            <pre className="mt-1 overflow-x-auto rounded-md bg-muted p-3 text-xs">
              {embedCode ?? "Not available"}
            </pre>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => void copyText(embedCode, "Embed code")}
          >
            <Copy className="mr-1 size-4" />
            Copy
          </Button>
        </div>
      </div>
    </div>
  );
}
