"use client";

import { useMemo } from "react";
import {
  DataTable,
  type DataTableColumn,
} from "@/components/data-display/data-table";
import { StatusBadge } from "@/components/data-display/status-badge";
import { InvitePlatformBusinessMemberDialog } from "@/features/platform/components/invite-platform-business-member-dialog";
import { SetBusinessOwnerDialog } from "@/features/platform/components/set-business-owner-dialog";
import type { BusinessMember } from "@/features/platform/types";

function TeamSummaryChip({
  label,
  value,
  emphasis = false,
}: {
  label: string;
  value: number;
  emphasis?: boolean;
}) {
  return (
    <div
      className={`rounded-md px-3 py-2 text-sm ${
        emphasis ? "bg-primary/10 text-primary" : "bg-muted/50"
      }`}
    >
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}

export function PlatformBusinessMembersTab({
  businessId,
  members,
  canInvite,
  canSetOwner,
}: {
  businessId: string;
  members?: BusinessMember[];
  canInvite: boolean;
  canSetOwner: boolean;
}) {
  const activeCount =
    members?.filter((m) => m.status === "ACTIVE").length ?? 0;
  const invitedCount =
    members?.filter((m) => m.status === "INVITED").length ?? 0;
  const ownerCount =
    members?.filter((m) => m.role === "OWNER").length ?? 0;
  const adminCount =
    members?.filter((m) => m.role === "ADMIN").length ?? 0;

  const columns = useMemo<DataTableColumn<BusinessMember>[]>(
    () => [
      {
        id: "email",
        header: "Email",
        sortable: true,
        sortValue: (row) => row.user.email,
        cell: (row) => row.user.email,
      },
      {
        id: "name",
        header: "Name",
        sortable: true,
        sortValue: (row) =>
          [row.user.firstName, row.user.lastName].filter(Boolean).join(" "),
        cell: (row) =>
          [row.user.firstName, row.user.lastName].filter(Boolean).join(" ") ||
          "—",
      },
      {
        id: "role",
        header: "Role",
        sortable: true,
        sortValue: (row) => row.role,
        cell: (row) => row.role,
      },
      {
        id: "status",
        header: "Status",
        sortable: true,
        sortValue: (row) => row.status,
        cell: (row) => (
          <StatusBadge status={row.status} domain="membership" />
        ),
      },
    ],
    [],
  );

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-lg ring-1 ring-border/70">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
          <div>
            <h3 className="text-sm font-medium">Team members</h3>
            <p className="text-xs text-muted-foreground">
              People who can access this business workspace.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {canInvite ? (
              <InvitePlatformBusinessMemberDialog businessId={businessId} />
            ) : null}
            {canSetOwner ? (
              <SetBusinessOwnerDialog businessId={businessId} />
            ) : null}
          </div>
        </div>

        <div className="grid gap-2 px-4 py-3 sm:grid-cols-4">
          <TeamSummaryChip label="Active" value={activeCount} emphasis />
          <TeamSummaryChip label="Invited" value={invitedCount} />
          <TeamSummaryChip label="Owners" value={ownerCount} />
          <TeamSummaryChip label="Admins" value={adminCount} />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={members ?? []}
        getRowId={(row) => row.id}
        emptyTitle="No members found"
        emptyDescription={
          canInvite
            ? "Invite the first team member to this business."
            : undefined
        }
        emptyAction={
          canInvite ? (
            <InvitePlatformBusinessMemberDialog
              businessId={businessId}
              variant="action"
            />
          ) : undefined
        }
      />
    </div>
  );
}
