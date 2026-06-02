"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { FormDialog } from "@/components/forms/form-dialog";
import { IntegrationResourcesPanel } from "@/components/integrations/integration-resources-panel";
import { IntegrationStatusBadge } from "@/components/integrations/integration-status-badge";
import { Button } from "@/components/ui/button";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { InstagramSetupChecklist } from "@/components/integrations/instagram-setup-checklist";
import { MetaAppReviewNotes } from "@/components/integrations/meta-app-review-notes";
import { MetaWebhookStatus } from "@/components/integrations/meta-webhook-status";
import {
  formatIntegrationDate,
  getIntegrationReconnectLabel,
  isMetaBusinessProvider,
  shouldUseOAuthPopup,
  type BusinessIntegration,
  type IntegrationProviderWithStatus,
  type IntegrationStatus,
} from "@/lib/integrations";
import { providerSupportsResources } from "@/lib/integration-resources";

const schema = z.object({
  connectedAccountName: z.string().max(255).optional(),
  connectedAccountEmail: z.string().email().optional().or(z.literal("")),
  configJson: z.string().optional(),
});

export type IntegrationManageFormValues = z.infer<typeof schema>;

export interface IntegrationManageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  provider: IntegrationProviderWithStatus | null;
  integrationDetail?: BusinessIntegration | null;
  mode: "connect" | "manage";
  isPending?: boolean;
  canDelete?: boolean;
  onSubmit: (values: IntegrationManageFormValues) => void;
  onDelete?: () => void;
  onReconnect?: () => void;
}

function parseConfigJson(value?: string): Record<string, unknown> | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  try {
    const parsed: unknown = JSON.parse(trimmed);
    if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    throw new Error("Config must be a JSON object");
  } catch {
    throw new Error("Config must be valid JSON");
  }
}

export function integrationFormToPayload(values: IntegrationManageFormValues) {
  const config = parseConfigJson(values.configJson);
  return {
    connectedAccountName: values.connectedAccountName?.trim() || undefined,
    connectedAccountEmail: values.connectedAccountEmail?.trim() || undefined,
    ...(config ? { config } : {}),
  };
}

function OAuthScopesList({ scopes }: { scopes: string[] }) {
  if (scopes.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Granted scopes</p>
      <ul className="max-h-32 space-y-1 overflow-y-auto text-xs text-muted-foreground">
        {scopes.map((scope) => (
          <li key={scope} className="truncate font-mono">
            {scope}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function IntegrationManageDialog({
  open,
  onOpenChange,
  provider,
  integrationDetail,
  mode,
  isPending = false,
  canDelete = false,
  onSubmit,
  onDelete,
  onReconnect,
}: IntegrationManageDialogProps) {
  const form = useForm<IntegrationManageFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      connectedAccountName: "",
      connectedAccountEmail: "",
      configJson: "",
    },
  });

  useEffect(() => {
    if (!open || !provider) return;

    form.reset({
      connectedAccountName: provider.integration?.connectedAccountName ?? "",
      connectedAccountEmail: provider.integration?.connectedAccountEmail ?? "",
      configJson: "",
    });
  }, [open, provider, form]);

  if (!provider) return null;

  const isOAuth = shouldUseOAuthPopup(provider);
  const isConnected = provider.status !== "NOT_CONNECTED";
  const title = mode === "connect" ? `Connect ${provider.name}` : `Manage ${provider.name}`;
  const oauthScopes = Array.isArray(integrationDetail?.config?.scopes)
    ? (integrationDetail.config.scopes as string[])
    : [];

  const handleSubmit = (values: IntegrationManageFormValues) => {
    try {
      integrationFormToPayload(values);
      onSubmit(values);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Invalid form data");
    }
  };

  if (isOAuth && mode === "manage") {
    return (
      <FormDialog
        open={open}
        onOpenChange={onOpenChange}
        title={title}
        description={provider.description ?? undefined}
        form={form}
        onSubmit={() => onOpenChange(false)}
        isPending={isPending}
        submitLabel="Close"
        size="lg"
      >
        <div className="space-y-3 rounded-lg border border-border/70 bg-muted/20 p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium">Status</span>
            <IntegrationStatusBadge status={provider.status as IntegrationStatus} />
          </div>
          {provider.integration?.connectedAccountName ? (
            <div className="flex justify-between gap-4 text-sm">
              <span className="text-muted-foreground">Account</span>
              <span className="truncate text-right">
                {provider.integration.connectedAccountName}
              </span>
            </div>
          ) : null}
          {provider.integration?.connectedAccountEmail ? (
            <div className="flex justify-between gap-4 text-sm">
              <span className="text-muted-foreground">Email</span>
              <span className="truncate text-right">
                {provider.integration.connectedAccountEmail}
              </span>
            </div>
          ) : null}
          {provider.integration?.connectedAt ? (
            <div className="flex justify-between gap-4 text-sm">
              <span className="text-muted-foreground">Connected</span>
              <span>{formatIntegrationDate(provider.integration.connectedAt)}</span>
            </div>
          ) : null}
          {provider.integration?.errorMessage ? (
            <div className="text-sm text-destructive">
              {provider.integration.errorMessage}
            </div>
          ) : null}
        </div>

        <OAuthScopesList scopes={oauthScopes} />

        {provider.key === "linkedin" ? (
          <div className="rounded-lg border border-border/70 bg-muted/20 p-4 text-sm text-muted-foreground">
            LinkedIn account is connected. Organization/Page resources and posting
            features require LinkedIn Marketing API approval and will be enabled
            later.
          </div>
        ) : null}

        {isMetaBusinessProvider(provider.key) ? (
          <MetaAppReviewNotes providerKey={provider.key} />
        ) : null}

        <MetaWebhookStatus
          webhookStatus={
            typeof integrationDetail?.config?.webhookStatus === "string"
              ? String(integrationDetail.config.webhookStatus)
              : null
          }
        />

        {providerSupportsResources(provider.key) && isConnected ? (
          <IntegrationResourcesPanel
            providerKey={provider.key}
            isConnected={isConnected}
            canManage={canDelete}
            showInstagramEmptyChecklist={provider.key === "instagram"}
          />
        ) : null}

        {onReconnect && canDelete ? (
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={isPending}
            onClick={onReconnect}
          >
            {getIntegrationReconnectLabel(provider)}
          </Button>
        ) : null}

        {isConnected && canDelete && onDelete ? (
          <div className="border-t border-border/70 pt-4">
            <Button
              type="button"
              variant="destructive"
              className="w-full"
              disabled={isPending}
              onClick={onDelete}
            >
              Delete integration
            </Button>
          </div>
        ) : null}
      </FormDialog>
    );
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={provider.description ?? undefined}
      form={form}
      schema={schema}
      onSubmit={handleSubmit}
      isPending={isPending}
      submitLabel={mode === "connect" ? "Connect" : "Save changes"}
      size="lg"
    >
      {mode === "manage" && isConnected ? (
        <div className="space-y-3 rounded-lg border border-border/70 bg-muted/20 p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium">Status</span>
            <IntegrationStatusBadge status={provider.status as IntegrationStatus} />
          </div>
          {provider.integration?.connectedAt ? (
            <div className="flex justify-between gap-4 text-sm">
              <span className="text-muted-foreground">Connected</span>
              <span>{formatIntegrationDate(provider.integration.connectedAt)}</span>
            </div>
          ) : null}
          {provider.integration?.lastSyncAt ? (
            <div className="flex justify-between gap-4 text-sm">
              <span className="text-muted-foreground">Last sync</span>
              <span>{formatIntegrationDate(provider.integration.lastSyncAt)}</span>
            </div>
          ) : null}
          {provider.integration?.errorMessage ? (
            <div className="text-sm text-destructive">
              {provider.integration.errorMessage}
            </div>
          ) : null}
        </div>
      ) : null}

      <FormField
        control={form.control}
        name="connectedAccountName"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Connected account name</FormLabel>
            <FormControl>
              <Input placeholder="Acme Corp" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="connectedAccountEmail"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Connected account email</FormLabel>
            <FormControl>
              <Input type="email" placeholder="billing@example.com" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="configJson"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Configuration (JSON)</FormLabel>
            <FormControl>
              <Textarea
                placeholder='{"webhookUrl": "https://..."}'
                rows={4}
                className="font-mono text-xs"
                {...field}
              />
            </FormControl>
            <FormDescription>
              Optional settings stored with this integration.
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      {mode === "manage" && isConnected && canDelete && onDelete ? (
        <div className="border-t border-border/70 pt-4">
          <Button
            type="button"
            variant="destructive"
            className="w-full"
            disabled={isPending}
            onClick={onDelete}
          >
            Delete integration
          </Button>
        </div>
      ) : null}
    </FormDialog>
  );
}
