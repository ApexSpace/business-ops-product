"use client";

import { Mail } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { getPlatformDefaultEmail } from "@/features/integrations/api/integrations.api";
import type { IntegrationProviderWithStatus } from "@/features/integrations/utils/integrations";
import { queryKeys } from "@/lib/query/keys";

interface IntegrationManageEmailBodyProps {
  provider: IntegrationProviderWithStatus;
  isConnected: boolean;
}

export function IntegrationManageEmailBody({
  provider,
  isConnected,
}: IntegrationManageEmailBodyProps) {
  const { data: platformEmail, isLoading } = useQuery({
    queryKey: queryKeys.integrations.platformEmail(),
    queryFn: () => getPlatformDefaultEmail(),
    enabled: provider.key === "email",
  });

  const fromAddress = platformEmail?.fromAddress ?? provider.integration?.connectedAccountEmail;
  const fromName = platformEmail?.fromName ?? provider.integration?.connectedAccountName;

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border/80 bg-muted/30 p-4">
        <div className="flex items-start gap-3">
          <div className="rounded-md bg-primary/10 p-2 text-primary">
            <Mail className="size-5" />
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium">CodeSol shared email</p>
              <Badge variant={isConnected ? "default" : "secondary"}>
                {isLoading ? "Checking…" : isConnected ? "Active" : "Not active"}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Your business sends and receives conversation email on our platform
              domain. No custom domain setup is required.
            </p>
            {fromAddress ? (
              <div className="rounded-md border border-border/60 bg-background px-3 py-2 text-sm">
                <p className="text-muted-foreground">Your address</p>
                <p className="font-mono text-foreground">
                  {fromName ? `${fromName} <${fromAddress}>` : fromAddress}
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Custom domain connection will be available here later. Transactional emails
        (invites, invoices) continue to use the platform system sender.
      </p>
    </div>
  );
}
