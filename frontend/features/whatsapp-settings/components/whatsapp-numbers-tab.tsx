"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  DataTable,
  type DataTableColumn,
} from "@/components/data-display/data-table";
import { EmptyState } from "@/components/data-display/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ResourceStatusBadge } from "@/features/integrations/components/resource-status-badge";
import type { WhatsAppNumber } from "@/features/whatsapp-settings/api/whatsapp-numbers.api";
import { useWhatsAppNumbers } from "@/features/whatsapp-settings/hooks/use-whatsapp-numbers";
import { formatResourceDate } from "@/features/integrations/utils/integration-resources";

function formatMessagingLimit(value: string | null): string {
  if (!value) return "—";
  return value.replace(/_/g, " ");
}

function formatQuality(value: string | null): string {
  if (!value) return "—";
  return value.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function WhatsAppNumbersSummary({
  wabaName,
  connectedAccountName,
  defaultPhoneNumber,
}: {
  wabaName?: string | null;
  connectedAccountName?: string | null;
  defaultPhoneNumber?: string | null;
}) {
  return (
    <div className="rounded-lg border border-border/70 bg-muted/20 px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="default">Connected</Badge>
        {wabaName ? (
          <span className="text-sm text-muted-foreground">
            WABA: <span className="text-foreground">{wabaName}</span>
          </span>
        ) : null}
      </div>
      {connectedAccountName || defaultPhoneNumber ? (
        <p className="mt-2 text-sm text-muted-foreground">
          {connectedAccountName ? `${connectedAccountName}` : null}
          {connectedAccountName && defaultPhoneNumber ? " · " : null}
          {defaultPhoneNumber ? defaultPhoneNumber : null}
        </p>
      ) : null}
    </div>
  );
}

export function WhatsAppNumbersTab() {
  const { overview, numbers, isLoading, isConnected } = useWhatsAppNumbers();

  const columns = useMemo<DataTableColumn<WhatsAppNumber>[]>(
    () => [
      {
        id: "phoneNumber",
        header: "Number",
        sortable: true,
        sortValue: (row) => row.phoneNumber,
        cell: (row) => (
          <span className="font-medium text-foreground">{row.phoneNumber}</span>
        ),
      },
      {
        id: "displayName",
        header: "Name",
        sortable: true,
        sortValue: (row) => row.displayName,
        cell: (row) => row.displayName,
      },
      {
        id: "messagingLimit",
        header: "Messaging limit",
        sortable: true,
        sortValue: (row) => row.messagingLimit ?? "",
        cell: (row) => (
          <span className="text-muted-foreground">
            {formatMessagingLimit(row.messagingLimit)}
          </span>
        ),
      },
      {
        id: "status",
        header: "Status",
        sortable: true,
        sortValue: (row) => row.status,
        cell: (row) => <ResourceStatusBadge status={row.status} />,
      },
      {
        id: "qualityRating",
        header: "Quality",
        sortable: true,
        sortValue: (row) => row.qualityRating ?? "",
        cell: (row) => (
          <span className="text-muted-foreground">
            {formatQuality(row.qualityRating)}
          </span>
        ),
      },
      {
        id: "lastSyncedAt",
        header: "Last synced",
        sortable: true,
        sortValue: (row) => row.lastSyncedAt ?? "",
        cell: (row) => (
          <span className="text-muted-foreground">
            {formatResourceDate(row.lastSyncedAt)}
          </span>
        ),
      },
    ],
    [],
  );

  if (isLoading) {
    return <Skeleton className="h-48 w-full" />;
  }

  if (!isConnected) {
    return (
      <EmptyState
        title="WhatsApp is not connected"
        description="Connect WhatsApp from Integrations to view your business number here."
        action={
          <Link
            href="/business/settings/integrations"
            className="text-sm font-medium text-primary hover:underline"
          >
            Connect WhatsApp in Integrations
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      <WhatsAppNumbersSummary
        wabaName={overview?.wabaName}
        connectedAccountName={overview?.connectedAccountName}
        defaultPhoneNumber={overview?.defaultPhoneNumber}
      />

      {numbers.length === 0 ? (
        <EmptyState
          title="No WhatsApp number synced yet"
          description="Your WhatsApp connection is active, but no phone number has been synced. Open Integrations and sync your WhatsApp number."
          action={
            <Link
              href="/business/settings/integrations"
              className="text-sm font-medium text-primary hover:underline"
            >
              Open Integrations
            </Link>
          }
        />
      ) : (
        <DataTable
          columns={columns}
          data={numbers}
          getRowId={(row) => row.id}
          emptyTitle="No number found."
        />
      )}

      <p className="text-xs text-muted-foreground">
        To connect, sync, or change your WhatsApp number, use{" "}
        <Link href="/business/settings/integrations" className="text-primary hover:underline">
          Settings → Integrations
        </Link>
        . One WhatsApp number is supported per business for now.
      </p>
    </div>
  );
}
