import { IntegrationProviderIcon } from "@/features/integrations/components/integration-provider-icon";
import { IntegrationStatusBadge } from "@/features/integrations/components/integration-status-badge";
import type {
  BusinessIntegration,
  IntegrationProviderWithStatus,
  IntegrationStatus,
} from "@/features/integrations/utils/integrations";
import { parseInstagramAuthFlowFromConfig } from "@/features/integrations/utils/integrations";
import {
  getInstagramConnectionMethodLabel,
  getIntegrationManageCopy,
} from "@/features/integrations/utils/integration-manage-copy";

export interface IntegrationManageHeaderProps {
  provider: IntegrationProviderWithStatus;
  integrationDetail?: BusinessIntegration | null;
}

export function IntegrationManageHeader({
  provider,
  integrationDetail,
}: IntegrationManageHeaderProps) {
  const authFlow =
    provider.key === "instagram"
      ? parseInstagramAuthFlowFromConfig(integrationDetail?.config)
      : undefined;
  const copy = getIntegrationManageCopy(provider.key, { authFlow });
  const connectionMethodLabel =
    provider.key === "instagram" && provider.status === "CONNECTED"
      ? getInstagramConnectionMethodLabel(authFlow ?? "FACEBOOK_LOGIN")
      : null;
  const accountLabel =
    provider.integration?.connectedAccountName ??
    provider.integration?.connectedAccountEmail;
  const needsSetup =
    provider.status === "CONNECTED" &&
    (provider.key === "facebook" || provider.key === "instagram") &&
    (provider.resourceCount ?? 0) === 0;

  return (
    <div className="flex gap-3">
      <IntegrationProviderIcon
        providerKey={provider.key}
        providerName={provider.name}
        logoUrl={provider.logoUrl}
        size="md"
      />
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-base font-semibold leading-tight">
            {copy.connectionTitle}
          </h2>
          <IntegrationStatusBadge
            status={provider.status as IntegrationStatus}
            needsSetup={needsSetup}
          />
          {connectionMethodLabel ? (
            <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              {connectionMethodLabel}
            </span>
          ) : null}
        </div>
        {accountLabel ? (
          <p className="text-sm text-muted-foreground">
            Connected as{" "}
            <span className="font-medium text-foreground">{accountLabel}</span>
          </p>
        ) : null}
        {provider.status === "ERROR" ? (
          <p className="text-sm text-destructive">
            This connection has a problem. Try reconnecting, or ask your admin
            for help.
          </p>
        ) : null}
        <p className="text-sm text-muted-foreground">{copy.description}</p>
      </div>
    </div>
  );
}
