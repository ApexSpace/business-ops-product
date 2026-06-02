"use client";

import { Suspense, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { ContactFormDialog } from "@/components/contacts/contact-form-dialog";
import { ContactIdentityCell } from "@/components/contacts/contact-identity-cell";
import {
  DataTable,
  type DataTableColumn,
} from "@/components/data-display/data-table";
import { SearchInput } from "@/components/forms/search-input";
import { FilterBar } from "@/components/layout/filter-bar";
import { ListPage, ListPageSkeleton } from "@/components/layout/list-page";
import { ActionButton } from "@/components/ui/action-button";
import { ListPagination } from "@/components/ui/list-pagination";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useListSearchParams } from "@/hooks/use-list-search-params";
import { apiClient } from "@/lib/api-client";
import { formatContactTableDate } from "@/lib/contact-profile";
import {
  invalidateContactLists,
  invalidateContactPicker,
} from "@/lib/query-invalidation";
import { queryKeys } from "@/lib/query-keys";
import type { Contact, PaginatedResult } from "@/types/api";

const LIST_SCHEMA = {
  page: { default: "1" },
  search: { default: "" },
} as const;

const PAGE_LIMIT = 20;

function BusinessContactsPageContent() {
  const queryClient = useQueryClient();
  const { params, page, setParams } = useListSearchParams(LIST_SCHEMA);
  const debouncedSearch = useDebouncedValue(params.search);
  const [dialogOpen, setDialogOpen] = useState(false);

  const listFilters = {
    page,
    limit: PAGE_LIMIT,
    search: debouncedSearch || undefined,
  };

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.contacts.list(listFilters),
    queryFn: () =>
      apiClient<PaginatedResult<Contact>>("contacts", {
        searchParams: {
          page,
          limit: PAGE_LIMIT,
          ...(debouncedSearch ? { search: debouncedSearch } : {}),
        },
      }),
  });

  const columns = useMemo<DataTableColumn<Contact>[]>(
    () => [
      {
        id: "name",
        header: "Name",
        sortable: true,
        sortValue: (row) => row.label,
        cell: (row) => (
          <ContactIdentityCell
            contactId={row.id}
            label={row.label}
            avatarUrl={row.avatarUrl}
          />
        ),
      },
      {
        id: "phone",
        header: "Phone",
        sortable: true,
        sortValue: (row) => row.phone ?? "",
        cell: (row) => (
          <span className="text-muted-foreground">{row.phone ?? "—"}</span>
        ),
      },
      {
        id: "email",
        header: "Email",
        sortable: true,
        sortValue: (row) => row.email ?? "",
        cell: (row) => (
          <span className="text-muted-foreground">{row.email ?? "—"}</span>
        ),
      },
      {
        id: "company",
        header: "Company Name",
        sortable: true,
        sortValue: (row) => row.companyName ?? "",
        cell: (row) => row.companyName ?? "—",
      },
      {
        id: "created",
        header: "Created",
        sortable: true,
        sortValue: (row) => row.createdAt,
        className: "whitespace-nowrap",
        cell: (row) => (
          <span className="tabular-nums text-muted-foreground">
            {formatContactTableDate(row.createdAt)}
          </span>
        ),
      },
      {
        id: "lastActivity",
        header: "Last Activity",
        sortable: true,
        sortValue: (row) => row.updatedAt,
        className: "whitespace-nowrap",
        cell: (row) => (
          <span className="tabular-nums text-muted-foreground">
            {formatContactTableDate(row.updatedAt)}
          </span>
        ),
      },
    ],
    [],
  );

  return (
    <>
      <ListPage
        title="Contacts"
        description="Manage customers, patients, or clients."
        actions={
          <ActionButton onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 size-4" />
            Add contact
          </ActionButton>
        }
        filters={
          <FilterBar>
            <SearchInput
              value={params.search}
              onChange={(value) =>
                setParams({ search: value, page: "1" }, { resetPage: true })
              }
              placeholder="Search contacts…"
            />
          </FilterBar>
        }
        pagination={
          data?.meta ? (
            <ListPagination
              meta={data.meta}
              page={page}
              onPageChange={(p) => setParams({ page: String(p) })}
              label="contacts"
            />
          ) : null
        }
      >
        <DataTable
          columns={columns}
          data={data?.items ?? []}
          getRowId={(row) => row.id}
          isLoading={isLoading}
          emptyTitle="No contacts yet"
          emptyDescription="Add your first contact to get started."
          emptyAction={
            <ActionButton onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 size-4" />
              Add contact
            </ActionButton>
          }
        />
      </ListPage>

      <ContactFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        contact={null}
        onSuccess={() => {
          void invalidateContactLists(queryClient);
          void invalidateContactPicker(queryClient);
        }}
      />
    </>
  );
}

export default function BusinessContactsPage() {
  return (
    <Suspense fallback={<ListPageSkeleton />}>
      <BusinessContactsPageContent />
    </Suspense>
  );
}
