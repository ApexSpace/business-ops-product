"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { FormDialog } from "@/components/forms/form-dialog";
import { IntegrationAdvancedDetails } from "@/features/integrations/components/integration-advanced-details";
import { IntegrationManageHeader } from "@/features/integrations/components/integration-manage-header";
import { IntegrationManageEmailBody } from "@/features/integrations/components/integration-manage-email-body";
import { IntegrationManageOAuthBody } from "@/features/integrations/components/integration-manage-oauth-body";
import { isPlatformEmailProvider } from "@/features/integrations/utils/integrations";
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
} from "@/features/integrations/utils/integrations";
import { getIntegrationManageCopy } from "@/features/integrations/utils/integration-manage-copy";
import {
  integrationFormToPayload,
  integrationManageFormSchema,
  type IntegrationManageFormValues,
} from "@/features/integrations/schemas/integration-manage-form";

export type { IntegrationManageFormValues } from "@/features/integrations/schemas/integration-manage-form";
export { integrationFormToPayload } from "@/features/integrations/schemas/integration-manage-form";

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
    resolver: zodResolver(integrationManageFormSchema),
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
  const isPlatformEmail = isPlatformEmailProvider(provider.key);
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

  if (isPlatformEmail) {
    return (
      <FormDialog
        open={open}
        onOpenChange={onOpenChange}
        title={title}
        description={copy.description}
        form={form}
        onSubmit={() => onOpenChange(false)}
        isPending={isPending}
        submitLabel="Close"
        size="lg"
        footerVariant="actions"
        hideCancel
      >
        <IntegrationManageEmailBody
          provider={provider}
          isConnected={isConnected}
        />
      </FormDialog>
    );
  }

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
        <IntegrationManageOAuthBody
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
      schema={integrationManageFormSchema}
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
