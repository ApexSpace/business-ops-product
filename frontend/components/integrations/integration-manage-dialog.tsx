"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { FormDialog } from "@/components/forms/form-dialog";
import { IntegrationAdvancedDetails } from "@/components/integrations/integration-advanced-details";
import { IntegrationMessagingStatus } from "@/components/integrations/integration-messaging-status";
import { IntegrationManageHeader } from "@/components/integrations/integration-manage-header";
import { IntegrationResourcesPanel } from "@/components/integrations/integration-resources-panel";
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
import {
  getIntegrationReconnectLabel,
  shouldUseOAuthPopup,
  type BusinessIntegration,
  type IntegrationProviderWithStatus,
} from "@/lib/integrations";
import { getIntegrationManageCopy } from "@/lib/integration-manage-copy";
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
  showAdvancedDetails?: boolean;
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

function OAuthManageDialogBody({
  provider,
  integrationDetail,
  isConnected,
  canDelete,
  showAdvancedDetails,
  oauthScopes,
  onReconnect,
}: {
  provider: IntegrationProviderWithStatus;
  integrationDetail?: BusinessIntegration | null;
  isConnected: boolean;
  canDelete: boolean;
  showAdvancedDetails: boolean;
  oauthScopes: string[];
  onReconnect?: () => void;
}) {
  const supportsResources = providerSupportsResources(provider.key);

  return (
    <div className="space-y-6">
      <IntegrationManageHeader provider={provider} />

      {(provider.key === "facebook" || provider.key === "instagram") && (
        <IntegrationMessagingStatus
          providerKey={provider.key}
          isConnected={isConnected}
        />
      )}

      {supportsResources && isConnected ? (
        <IntegrationResourcesPanel
          providerKey={provider.key}
          isConnected={isConnected}
          canManage={canDelete}
          onReconnect={onReconnect}
        />
      ) : provider.key === "linkedin" && isConnected ? (
        <div className="rounded-lg border border-border/70 bg-muted/20 p-4 text-sm text-muted-foreground">
          Your LinkedIn account is connected. Additional organization features
          will appear here when they are available.
        </div>
      ) : null}

      {showAdvancedDetails ? (
        <IntegrationAdvancedDetails
          provider={provider}
          integrationDetail={integrationDetail}
          oauthScopes={oauthScopes}
        />
      ) : null}
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
  showAdvancedDetails = true,
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
  const copy = getIntegrationManageCopy(provider.key);
  const title =
    mode === "connect" ? `Connect ${provider.name}` : copy.connectionTitle;
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
        form={form}
        onSubmit={() => onOpenChange(false)}
        isPending={isPending}
        submitLabel="Close"
        size="lg"
        footerVariant="actions"
        hideCancel
        onReconnect={
          isConnected && canDelete && onReconnect ? onReconnect : undefined
        }
        reconnectLabel={getIntegrationReconnectLabel(provider)}
        onDelete={isConnected && canDelete && onDelete ? onDelete : undefined}
        deleteLabel={copy.disconnectLabel}
        isDeletePending={isPending}
      >
        <OAuthManageDialogBody
          provider={provider}
          integrationDetail={integrationDetail}
          isConnected={isConnected}
          canDelete={canDelete}
          showAdvancedDetails={showAdvancedDetails}
          oauthScopes={oauthScopes}
          onReconnect={onReconnect}
        />
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
      onDelete={
        mode === "manage" && isConnected && canDelete && onDelete
          ? onDelete
          : undefined
      }
      deleteLabel={copy.disconnectLabel}
    >
      {mode === "manage" && isConnected ? (
        <IntegrationManageHeader provider={provider} />
      ) : null}

      <FormField
        control={form.control}
        name="connectedAccountName"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Account name</FormLabel>
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
            <FormLabel>Account email</FormLabel>
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

      {mode === "manage" && isConnected && showAdvancedDetails ? (
        <IntegrationAdvancedDetails
          provider={provider}
          integrationDetail={integrationDetail}
          oauthScopes={oauthScopes}
        />
      ) : null}
    </FormDialog>
  );
}
