"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  DataTable,
  type DataTableColumn,
} from "@/components/data-display/data-table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ListPagination } from "@/components/ui/list-pagination";
import {
  EMAIL_STATUS_OPTIONS,
  EMAIL_TYPE_OPTIONS,
  emailStatusLabel,
  entityLinkForLog,
  listEmailLogs,
  type EmailLog,
} from "@/features/email-notifications/api/email-notifications.api";
import { queryKeys } from "@/lib/query/keys";

function emailStatusVariant(
  status: EmailLog["status"],
): "default" | "secondary" | "outline" | "destructive" {
  if (status === "DELIVERED" || status === "SENT") return "default";
  if (status === "QUEUED" || status === "SENDING") return "secondary";
  if (status === "BOUNCED" || status === "FAILED") return "destructive";
  return "outline";
}

export function EmailLogsTab() {
  const [search, setSearch] = useState("");
  const [emailType, setEmailType] = useState("");
  const [status, setStatus] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const limit = 25;

  const filters = {
    search,
    emailType,
    status,
    dateFrom,
    dateTo,
    page,
    limit,
  };

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.emailNotifications.logs(filters),
    queryFn: () =>
      listEmailLogs({
        page,
        limit,
        search: search || undefined,
        emailType: emailType || undefined,
        status: status || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo ? `${dateTo}T23:59:59.999Z` : undefined,
      }),
  });

  const columns = useMemo<DataTableColumn<EmailLog>[]>(
    () => [
      {
        id: "toEmail",
        header: "Recipient",
        sortable: true,
        sortValue: (row) => row.toEmail,
        cell: (row) => (
          <div className="min-w-[180px]">
            <p className="font-medium">{row.toEmail}</p>
            <p className="line-clamp-1 text-xs text-muted-foreground">
              {row.subject}
            </p>
          </div>
        ),
      },
      {
        id: "emailType",
        header: "Type",
        sortable: true,
        sortValue: (row) => row.emailType,
        cell: (row) => (
          <span className="font-mono text-xs">{row.emailType}</span>
        ),
      },
      {
        id: "status",
        header: "Status",
        sortable: true,
        sortValue: (row) => row.status,
        cell: (row) => (
          <Badge variant={emailStatusVariant(row.status)}>
            {emailStatusLabel(row.status)}
          </Badge>
        ),
      },
      {
        id: "sentAt",
        header: "Sent",
        sortable: true,
        sortValue: (row) => row.sentAt ?? row.createdAt,
        cell: (row) => (
          <span className="text-sm text-muted-foreground">
            {row.sentAt
              ? new Date(row.sentAt).toLocaleString()
              : "—"}
          </span>
        ),
      },
      {
        id: "deliveredAt",
        header: "Delivered",
        sortable: true,
        sortValue: (row) => row.deliveredAt ?? "",
        cell: (row) => (
          <span className="text-sm text-muted-foreground">
            {row.deliveredAt
              ? new Date(row.deliveredAt).toLocaleString()
              : "—"}
          </span>
        ),
      },
      {
        id: "entity",
        header: "Related",
        cell: (row) => {
          const href = entityLinkForLog(row);
          if (!href) {
            return <span className="text-muted-foreground">—</span>;
          }
          return (
            <Link
              href={href}
              className="text-sm text-primary hover:underline"
            >
              {row.entityType}
            </Link>
          );
        },
      },
      {
        id: "error",
        header: "Error",
        cell: (row) =>
          row.errorMessage ? (
            <span className="line-clamp-2 text-xs text-destructive">
              {row.errorMessage}
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
    ],
    [],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[180px] flex-1">
          <Label htmlFor="log-search" className="text-xs">
            Search
          </Label>
          <Input
            id="log-search"
            className="mt-1"
            placeholder="Search recipient or subject…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <div>
          <Label htmlFor="log-type" className="text-xs">
            Email type
          </Label>
          <select
            id="log-type"
            value={emailType}
            onChange={(e) => {
              setEmailType(e.target.value);
              setPage(1);
            }}
            className="mt-1 flex h-9 w-[160px] rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
          >
            <option value="">All types</option>
            {EMAIL_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="log-status" className="text-xs">
            Status
          </Label>
          <select
            id="log-status"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="mt-1 flex h-9 w-[140px] rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
          >
            <option value="">All statuses</option>
            {EMAIL_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="log-from" className="text-xs">
            From date
          </Label>
          <Input
            id="log-from"
            type="date"
            className="mt-1 w-36"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <div>
          <Label htmlFor="log-to" className="text-xs">
            To date
          </Label>
          <Input
            id="log-to"
            type="date"
            className="mt-1 w-36"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>

      <DataTable<EmailLog>
        columns={columns}
        data={data?.items ?? []}
        getRowId={(row) => row.id}
        isLoading={isLoading}
        emptyTitle="No emails sent yet."
      />

      {data?.meta ? (
        <ListPagination
          meta={data.meta}
          page={page}
          onPageChange={setPage}
          label="emails"
        />
      ) : null}
    </div>
  );
}
