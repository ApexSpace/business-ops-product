"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { PaginatedResult } from "@/lib/types/shared";

interface AuditLogItem {
  id: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  createdAt: string;
}

export function PlatformBusinessAuditTab({
  auditLogs,
}: {
  auditLogs?: PaginatedResult<AuditLogItem>;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Action</TableHead>
          <TableHead>Entity</TableHead>
          <TableHead>When</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {auditLogs?.items.map((log) => (
          <TableRow key={log.id}>
            <TableCell>{log.action}</TableCell>
            <TableCell>
              {log.entityType}
              {log.entityId ? ` · ${log.entityId.slice(0, 8)}…` : ""}
            </TableCell>
            <TableCell>
              {new Date(log.createdAt).toLocaleString()}
            </TableCell>
          </TableRow>
        ))}
        {!auditLogs?.items.length ? (
          <TableRow>
            <TableCell colSpan={3} className="text-muted-foreground">
              No audit logs
            </TableCell>
          </TableRow>
        ) : null}
      </TableBody>
    </Table>
  );
}
