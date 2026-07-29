"use client";

import { ConfirmDeleteDialog } from "@/components/forms/confirm-delete-dialog";
import { IntegrationCategoryTabs } from "@/features/integrations/components/integration-category-tabs";
import { IntegrationGrid } from "@/features/integrations/components/integration-grid";
import { IntegrationManageDialog } from "@/features/integrations/components/integration-manage-dialog";
import { InstagramConnectChooserDialog } from "@/features/integrations/components/instagram-connect-chooser-dialog";
import { OAuthPopupBlockedDialog } from "@/features/integrations/components/oauth-popup-blocked-dialog";
import { PageHeader } from "@/components/layout/page-header";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  INTEGRATION_CATEGORY_LABELS,
  shouldUseOAuthPopup,
  usesWhatsAppEmbeddedSignup,
} from "@/features/integrations/utils/integrations";
import { usePlatformIntegrationsSettings } from "@/features/settings/hooks/use-platform-integrations-settings";
import { toast } from "sonner";

export function PlatformIntegrationsSettings() {
  const s = usePlatformIntegrationsSettings();

  return (
    <div className="w-full min-w-0 space-y-6">
      <PageHeader />

      <IntegrationCategoryTabs value={s.category} onValueChange={s.setCategory} />

      {s.isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <IntegrationGrid
          providers={s.filteredProviders}
          canManage={s.canManage}
          connectingProviderKey={s.connectingProviderKey}
          onPrimaryAction={s.handlePrimaryAction}
          onManage={s.openManage}
          onDelete={s.handleDelete}
          onViewDetails={(provider) => {
            s.setSelectedProvider(provider);
            s.setDetailsOpen(true);
          }}
          onRefreshStatus={() => {
            toast.message(
              "Status refresh will be available when provider sync is implemented.",
            );
          }}
          emptyMessage="No integrations match this filter."
        />
      )}

      <IntegrationManageDialog
        open={s.dialogOpen}
        onOpenChange={s.setDialogOpen}
        provider={s.selectedProvider}
        integrationDetail={s.integrationDetail ?? null}
        mode={s.dialogMode}
        isPending={s.isPending}
        canDelete={s.canManage}
        showAdvancedDetails={s.canManage}
        host="platform"
        isSyncingAssets={
          !!s.selectedProvider &&
          s.syncingAssetsProviderKey === s.selectedProvider.key
        }
        onSubmit={s.handleDialogSubmit}
        onDelete={() => s.setDeleteOpen(true)}
        onReconnect={
          s.selectedProvider
            ? () => {
                if (usesWhatsAppEmbeddedSignup(s.selectedProvider!.key)) {
                  void s.startWhatsAppEmbeddedSignup(s.selectedProvider!);
                } else if (s.selectedProvider!.key === "instagram") {
                  s.openInstagramChooser(s.selectedProvider!);
                } else if (shouldUseOAuthPopup(s.selectedProvider!)) {
                  s.startOAuthConnect(s.selectedProvider!);
                }
              }
            : undefined
        }
      />

      <InstagramConnectChooserDialog
        open={s.instagramChooserOpen}
        onOpenChange={s.setInstagramChooserOpen}
        onSelect={(authFlow) => {
          if (s.instagramChooserProvider) {
            s.startOAuthConnect(s.instagramChooserProvider, { authFlow });
          }
        }}
      />

      <OAuthPopupBlockedDialog
        open={s.popupBlockedOpen}
        onOpenChange={s.setPopupBlockedOpen}
        oauthUrl={s.blockedOAuthUrl}
      />

      <ConfirmDeleteDialog
        open={s.deleteOpen}
        onOpenChange={s.setDeleteOpen}
        title="Delete integration"
        description={
          <>
            Remove the connection to{" "}
            <strong>{s.selectedProvider?.name}</strong>? This cannot be undone.
          </>
        }
        isPending={s.deleteMutation.isPending}
        onConfirm={() => {
          if (s.selectedProvider) {
            s.deleteMutation.mutate(s.selectedProvider.key);
          }
        }}
      />

      <Dialog open={s.detailsOpen} onOpenChange={s.setDetailsOpen}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>{s.selectedProvider?.name}</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-3 text-sm">
            <p className="text-muted-foreground">
              {s.selectedProvider?.description ?? "No description available."}
            </p>
            {s.selectedProvider ? (
              <p>
                <span className="text-muted-foreground">Category: </span>
                {INTEGRATION_CATEGORY_LABELS[s.selectedProvider.category]}
              </p>
            ) : null}
            {s.selectedProvider?.integration?.connectedAccountEmail ? (
              <p>
                <span className="text-muted-foreground">Account: </span>
                {s.selectedProvider.integration.connectedAccountEmail}
              </p>
            ) : null}
          </DialogBody>
        </DialogContent>
      </Dialog>
    </div>
  );
}
