"use client";

import { Suspense, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import {
  DataTable,
  type DataTableColumn,
} from "@/components/data-display/data-table";
import { StatusBadge } from "@/components/data-display/status-badge";
import { FormDialog } from "@/components/forms/form-dialog";
import { SearchInput } from "@/components/forms/search-input";
import { SelectField } from "@/components/forms/select-field";
import { TextField } from "@/components/forms/text-field";
import { FilterBar } from "@/components/layout/filter-bar";
import { ListPage, ListPageSkeleton } from "@/components/layout/list-page";
import { ActionButton } from "@/components/ui/action-button";
import { Button } from "@/components/ui/button";
import { ListPagination } from "@/components/ui/list-pagination";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import { useListSearchParams } from "@/lib/hooks/use-list-search-params";
import { useAuth } from "@/lib/auth/provider";
import { invalidateBusinessMembers } from "@/lib/query/invalidation";
import { queryKeys } from "@/lib/query/keys";
import { PERMISSIONS, useCan } from "@/features/auth/permissions";
import { memberRoleOptions } from "@/features/settings/utils/select-options";
import type { BusinessMember, PaginatedResult } from "@/features/settings/types";
import { inviteBusinessMember, listBusinessMembers } from "@/features/settings/api/business.api";

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["OWNER", "ADMIN", "MEMBER"]),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

type InviteForm = z.infer<typeof inviteSchema>;

const LIST_SCHEMA = {
  page: { default: "1" },
  search: { default: "" },
} as const;

const PAGE_LIMIT = 20;

function BusinessTeamSettingsContent() {
  const { jwt, contexts } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const canInvite = useCan(PERMISSIONS["members.invite"]);
  const { params, page, setParams } = useListSearchParams(LIST_SCHEMA);
  const debouncedSearch = useDebouncedValue(params.search);

  const listFilters = {
    page,
    limit: PAGE_LIMIT,
    search: debouncedSearch || undefined,
  };

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.business.members(listFilters),
    queryFn: () =>
      listBusinessMembers({
        page,
        limit: PAGE_LIMIT,
        search: debouncedSearch || undefined,
      }),
  });

  const form = useForm<InviteForm>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { email: "", role: "MEMBER", firstName: "", lastName: "" },
  });

  const inviteMutation = useMutation({
    mutationFn: (values: InviteForm) =>
      inviteBusinessMember(values),
    onSuccess: () => {
      toast.success("Invitation sent");
      void invalidateBusinessMembers(queryClient);
      setOpen(false);
      form.reset();
    },
    onError: (err: Error) => toast.error(err.message),
  });

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
    <div className="w-full min-w-0">
      <ListPage
        title="Team"
        description="People who can access this business workspace."
        actions={
          canInvite ? (
            <ActionButton type="button" onClick={() => setOpen(true)}>
              <Plus className="mr-2 size-4" />
              Invite member
            </ActionButton>
          ) : null
        }
        filters={
          <FilterBar>
            <SearchInput
              value={params.search}
              onChange={(value) =>
                setParams({ search: value, page: "1" }, { resetPage: true })
              }
              placeholder="Search members…"
            />
          </FilterBar>
        }
        pagination={
          data?.meta ? (
            <ListPagination
              meta={data.meta}
              page={page}
              onPageChange={(p) => setParams({ page: String(p) })}
              label="members"
            />
          ) : null
        }
      >
        <DataTable
          columns={columns}
          data={data?.items ?? []}
          getRowId={(row) => row.id}
          isLoading={isLoading}
          emptyTitle="No members found"
          emptyDescription={
            canInvite ? "Invite your first team member." : undefined
          }
          emptyAction={
            canInvite ? (
              <ActionButton onClick={() => setOpen(true)}>
                <Plus className="mr-2 size-4" />
                Invite member
              </ActionButton>
            ) : undefined
          }
        />
      </ListPage>

      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title="Invite team member"
        form={form}
        schema={inviteSchema}
        onSubmit={(v) => inviteMutation.mutate(v)}
        isPending={inviteMutation.isPending}
        submitLabel="Send invite"
      >
        <TextField control={form.control} name="email" label="Email" type="email" />
        <SelectField
          control={form.control}
          name="role"
          label="Role"
          items={memberRoleOptions}
        />
      </FormDialog>
    </div>
  );
}

export function BusinessTeamSettings() {
  return (
    <Suspense fallback={<ListPageSkeleton />}>
      <BusinessTeamSettingsContent />
    </Suspense>
  );
}
