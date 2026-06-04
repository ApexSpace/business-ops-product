"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SetBusinessOwnerDialog } from "@/features/platform/components/set-business-owner-dialog";
import type { BusinessMember } from "@/features/platform/types";

export function PlatformBusinessMembersTab({
  businessId,
  members,
  canSetOwner,
}: {
  businessId: string;
  members?: BusinessMember[];
  canSetOwner: boolean;
}) {
  return (
    <>
      {canSetOwner ? (
        <div className="mb-3 flex items-center justify-end">
          <SetBusinessOwnerDialog businessId={businessId} />
        </div>
      ) : null}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Email</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {members?.map((m) => (
            <TableRow key={m.id}>
              <TableCell>{m.user.email}</TableCell>
              <TableCell>
                {[m.user.firstName, m.user.lastName]
                  .filter(Boolean)
                  .join(" ") || "—"}
              </TableCell>
              <TableCell>{m.role}</TableCell>
              <TableCell>{m.status}</TableCell>
            </TableRow>
          ))}
          {!members?.length ? (
            <TableRow>
              <TableCell colSpan={4} className="text-muted-foreground">
                No members
              </TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </Table>
    </>
  );
}
