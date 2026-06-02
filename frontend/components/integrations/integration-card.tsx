"use client";

import { Loader2, MoreVertical } from "lucide-react";
import { IntegrationProviderIcon } from "@/components/integrations/integration-provider-icon";
import { IntegrationStatusBadge } from "@/components/integrations/integration-status-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { IconButton } from "@/components/ui/icon-button";
import {
  formatIntegrationDate,
  getIntegrationConnectLabel,
  getOAuthOpeningLabel,
  type IntegrationProviderWithStatus,
} from "@/lib/integrations";
import { cn } from "@/lib/utils";

export interface IntegrationCardProps {
  provider: IntegrationProviderWithStatus;
  canManage?: boolean;
  isConnecting?: boolean;
  onPrimaryAction: (provider: IntegrationProviderWithStatus) => void;
  onManage: (provider: IntegrationProviderWithStatus) => void;
  onDelete: (provider: IntegrationProviderWithStatus) => void;
  onViewDetails: (provider: IntegrationProviderWithStatus) => void;
  onRefreshStatus?: (provider: IntegrationProviderWithStatus) => void;
}

export function IntegrationCard({
  provider,
  canManage = true,
  isConnecting = false,
  onPrimaryAction,
  onManage,
  onDelete,
  onViewDetails,
  onRefreshStatus,
}: IntegrationCardProps) {
  const isConnected = provider.status !== "NOT_CONNECTED";
  const accountLabel =
    provider.integration?.connectedAccountName ??
    provider.integration?.connectedAccountEmail;
  const lastSyncAt = provider.integration?.lastSyncAt;

  return (
    <Card
      size="sm"
      className={cn(
        "flex h-full min-h-[208px] flex-col gap-2 py-3",
        "bg-card shadow-md ring-1 ring-border/80",
        "dark:bg-card dark:shadow-md dark:shadow-black/25 dark:ring-border",
      )}
    >
      <CardHeader className="shrink-0 pb-0">
        <div className="flex items-start gap-3">
          <IntegrationProviderIcon
            providerKey={provider.key}
            providerName={provider.name}
            logoUrl={provider.logoUrl}
          />
          <div className="min-w-0 flex-1 space-y-1">
            <CardTitle className="truncate" title={provider.name}>
              {provider.name}
            </CardTitle>
            <IntegrationStatusBadge status={provider.status} />
          </div>
        </div>
        <CardAction>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <IconButton
                  aria-label={`Actions for ${provider.name}`}
                  className="size-8"
                >
                  <MoreVertical className="size-4" />
                </IconButton>
              }
            />
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem
                disabled={!canManage}
                onClick={() => onManage(provider)}
              >
                Manage
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onViewDetails(provider)}>
                View details
              </DropdownMenuItem>
              {onRefreshStatus ? (
                <DropdownMenuItem onClick={() => onRefreshStatus(provider)}>
                  Refresh status
                </DropdownMenuItem>
              ) : null}
              {isConnected ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    disabled={!canManage}
                    onClick={() => onDelete(provider)}
                  >
                    Delete integration
                  </DropdownMenuItem>
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        </CardAction>
      </CardHeader>

      <CardContent className="flex min-h-0 flex-1 flex-col pt-0">
        <CardDescription
          className={cn(
            "line-clamp-2 min-h-[2.5rem] text-[13px] leading-snug",
            !provider.description && "text-transparent select-none",
          )}
          title={provider.description ?? undefined}
        >
          {provider.description ?? "No description available."}
        </CardDescription>

        <p
          className={cn(
            "mt-1.5 min-h-[0.875rem] truncate text-xs",
            accountLabel || isConnected
              ? "text-muted-foreground"
              : "text-transparent select-none",
          )}
          title={accountLabel ?? (isConnected ? "Connected" : undefined)}
        >
          {accountLabel ?? (isConnected ? "Connected" : "\u00A0")}
        </p>
      </CardContent>

      <CardFooter className="mt-auto shrink-0 flex-col items-stretch gap-1 border-t border-border/90 bg-muted/40 py-2 dark:bg-muted/25">
        {lastSyncAt ? (
          <p
            className="truncate text-xs text-muted-foreground"
            title={`Last sync: ${formatIntegrationDate(lastSyncAt)}`}
          >
            Last sync: {formatIntegrationDate(lastSyncAt)}
          </p>
        ) : null}
        <Button
          className="w-full"
          variant={isConnected ? "outline" : "default"}
          disabled={!canManage || isConnecting}
          onClick={() => onPrimaryAction(provider)}
        >
          {isConnecting ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              {getOAuthOpeningLabel(provider)}
            </>
          ) : (
            getIntegrationConnectLabel(provider, provider.status)
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
