import { IntegrationProviderIcon } from "@/features/integrations/components/integration-provider-icon";
import { IntegrationStatusBadge } from "@/features/integrations/components/integration-status-badge";
import type { IntegrationProviderWithStatus, IntegrationStatus } from "@/features/integrations/utils/integrations";
import { getIntegrationManageCopy } from "@/features/integrations/utils/integration-manage-copy";

export interface IntegrationManageHeaderProps {
  provider: IntegrationProviderWithStatus;
}

export function IntegrationManageHeader({ provider }: IntegrationManageHeaderProps) {
  const copy = getIntegrationManageCopy(provider.key);
  const accountLabel =
    provider.integration?.connectedAccountName ??
    provider.integration?.connectedAccountEmail;

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
          <IntegrationStatusBadge status={provider.status as IntegrationStatus} />
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
