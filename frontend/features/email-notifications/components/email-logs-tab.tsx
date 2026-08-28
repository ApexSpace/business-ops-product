"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { type DataTableColumn } from "@/components/data-display/data-table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EntityListLayout } from "@/components/layout/entity-list-layout";
import { ListFilterCheckboxGroup } from "@/components/layout/list-filter-checkbox-group";
import { ListPagination } from "@/components/ui/list-pagination";
import {
  EMAIL_STATUS_OPTIONS,
  EMAIL_TYPE_OPTIONS,
  emailStatusLabel,
  entityLinkForLog,
  listEmailLogs,
  type EmailLog,
} from "@/features/email-notifications/api/email-notifications.api";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import {
  ALL_STATUSES_EMPTY_OPTION,
  ALL_TYPES_EMPTY_OPTION,
} from "@/lib/ui/filter-labels";
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
  const [filterOpen, setFilterOpen] = useState(false);
  const [draftType, setDraftType] = useState("");
  const [draftStatus, setDraftStatus] = useState("");
  const [draftFrom, setDraftFrom] = useState("");
  const [draftTo, setDraftTo] = useState("");
  const limit = 25;
  const debouncedSearch = useDebouncedValue(search, 300);

  const filters = {
    search: debouncedSearch,
    emailType,
    status,
    dateFrom,
    dateTo,
    page,
    limit,
  };

  const { data, isLoading, isFetching } = useQuery({
    queryKey: queryKeys.emailNotifications.logs(filters),
    queryFn: () =>
      listEmailLogs({
        page,
        limit,
        search: debouncedSearch || undefined,
        emailType: emailType || undefined,
        status: status || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo ? `${dateTo}T23:59:59.999Z` : undefined,
      }),
    placeholderData: (previous) => previous,
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
    <EntityListLayout
      title="Email logs"
      hideHeader
      flush
      searchPlaceholder="Search recipient or subject…"
      searchValue={search}
      onSearchChange={(value) => {
        setSearch(value);
        setPage(1);
      }}
      filterAriaLabel="Email log filters"
      filterActive={Boolean(emailType || status || dateFrom || dateTo)}
      filterOpen={filterOpen}
      onFilterOpenChange={(open) => {
        if (open) {
          setDraftType(emailType);
          setDraftStatus(status);
          setDraftFrom(dateFrom);
          setDraftTo(dateTo);
        }
        setFilterOpen(open);
      }}
      filterContent={
        <>
          <ListFilterCheckboxGroup
            legend="Email type"
            options={[
              ALL_TYPES_EMPTY_OPTION,
              ...EMAIL_TYPE_OPTIONS.map((option) => ({
                value: option.value,
                label: option.label,
              })),
            ]}
            value={draftType}
            onChange={(next) => setDraftType(String(next))}
          />
          <ListFilterCheckboxGroup
            legend="Status"
            options={[
              ALL_STATUSES_EMPTY_OPTION,
              ...EMAIL_STATUS_OPTIONS,
            ]}
            value={draftStatus}
            onChange={(next) => setDraftStatus(String(next))}
          />
          <div className="flex w-full min-w-0 flex-col gap-2">
            <Label htmlFor="log-from">From date</Label>
            <Input
              id="log-from"
              type="date"
              value={draftFrom}
              onChange={(e) => setDraftFrom(e.target.value)}
            />
            <Label htmlFor="log-to">To date</Label>
            <Input
              id="log-to"
              type="date"
              value={draftTo}
              onChange={(e) => setDraftTo(e.target.value)}
            />
          </div>
        </>
      }
      onFilterApply={() => {
        setEmailType(draftType);
        setStatus(draftStatus);
        setDateFrom(draftFrom);
        setDateTo(draftTo);
        setPage(1);
      }}
      footer={
        data?.meta ? (
          <ListPagination
            meta={data.meta}
            page={page}
            onPageChange={setPage}
            label="emails"
          />
        ) : undefined
      }
      columns={columns}
      data={data?.items ?? []}
      getRowId={(row) => row.id}
      isLoading={isLoading || (isFetching && !data)}
      emptyTitle="No email logs for this business."
    />
  );
}
