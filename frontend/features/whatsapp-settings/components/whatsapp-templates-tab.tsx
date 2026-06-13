"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import {
  DataTable,
  type DataTableColumn,
} from "@/components/data-display/data-table";
import { DataTableRowActions } from "@/components/data-display/data-table-row-actions";
import { EmptyState } from "@/components/data-display/empty-state";
import { ConfirmDeleteDialog } from "@/components/forms/confirm-delete-dialog";
import { SearchInput } from "@/components/forms/search-input";
import { SearchableSelect } from "@/components/forms/searchable-select";
import { FilterBar } from "@/components/layout/filter-bar";
import { ActionButton } from "@/components/ui/action-button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { SyncResourcesButton } from "@/features/integrations/components/sync-resources-button";
import {
  getWhatsAppTemplate,
  type WhatsAppTemplateCategory,
  type WhatsAppTemplateListItem,
} from "@/features/whatsapp-settings/api/whatsapp-templates.api";
import { WhatsAppTemplateDetailSheet } from "@/features/whatsapp-settings/components/whatsapp-template-detail-sheet";
import { WhatsAppTemplateEditorDialog } from "@/features/whatsapp-settings/components/whatsapp-template-editor-dialog";
import { WhatsAppTemplateStatusBadge } from "@/features/whatsapp-settings/components/whatsapp-template-status-badge";
import { useWhatsAppTemplateMutations } from "@/features/whatsapp-settings/hooks/use-whatsapp-template-mutations";
import {
  useWhatsAppTemplate,
  useWhatsAppTemplates,
} from "@/features/whatsapp-settings/hooks/use-whatsapp-templates";
import { useWhatsAppNumbers } from "@/features/whatsapp-settings/hooks/use-whatsapp-numbers";
import {
  canDeleteTemplateFromStatus,
  canEditTemplateFromStatus,
  formatTemplateCategory,
  formatTemplateTableDate,
  truncatePreview,
} from "@/features/whatsapp-settings/utils/whatsapp-template-display.util";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";

const CATEGORY_OPTIONS = [
  { value: "all", label: "All categories" },
  { value: "UTILITY", label: "Utility" },
  { value: "MARKETING", label: "Marketing" },
  { value: "AUTHENTICATION", label: "Authentication" },
];

export function WhatsAppTemplatesTab() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const debouncedSearch = useDebouncedValue(search);
  const { isConnected, isLoading: isConnectionLoading } = useWhatsAppNumbers();

  const action = searchParams.get("action");
  const selectedId = searchParams.get("id");

  const filters = useMemo(
    () => ({
      search: debouncedSearch || undefined,
      category:
        category === "all"
          ? undefined
          : (category as WhatsAppTemplateCategory),
      sortBy: "updatedAt" as const,
      sortOrder: "desc" as const,
      limit: 50,
    }),
    [debouncedSearch, category],
  );

  const { data, isLoading } = useWhatsAppTemplates(filters);
  const { data: selectedTemplate } = useWhatsAppTemplate(selectedId);
  const {
    duplicateMutation,
    syncAllMutation,
    syncOneMutation,
    deleteMutation,
  } = useWhatsAppTemplateMutations();

  const setTemplateRoute = useCallback(
    (next: { action?: string | null; id?: string | null }) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", "templates");
      if (next.action) params.set("action", next.action);
      else params.delete("action");
      if (next.id) params.set("id", next.id);
      else params.delete("id");
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const editorOpen =
    action === "create" ||
    (action === "edit" && Boolean(selectedId) && Boolean(selectedTemplate));
  const detailOpen = action === "view" && Boolean(selectedId);
  const editorMode = action === "edit" ? "edit" : "create";

  const columns = useMemo<DataTableColumn<WhatsAppTemplateListItem>[]>(
    () => [
      {
        id: "name",
        header: "Name",
        sortable: true,
        sortValue: (row) => row.name,
        cell: (row) => (
          <button
            type="button"
            className="font-medium text-foreground hover:underline"
            onClick={() => setTemplateRoute({ action: "view", id: row.id })}
          >
            {row.name}
          </button>
        ),
      },
      {
        id: "category",
        header: "Category",
        sortable: true,
        sortValue: (row) => row.category,
        cell: (row) => formatTemplateCategory(row.category),
      },
      {
        id: "language",
        header: "Language",
        sortable: true,
        sortValue: (row) => row.language,
        cell: (row) => row.language,
      },
      {
        id: "status",
        header: "Status",
        sortable: true,
        sortValue: (row) => row.status,
        cell: (row) =>
          row.rejectionReason ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <WhatsAppTemplateStatusBadge status={row.status} />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  {row.rejectionReason}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <WhatsAppTemplateStatusBadge status={row.status} />
          ),
      },
      {
        id: "updatedAt",
        header: "Last updated",
        sortable: true,
        sortValue: (row) => row.updatedAt,
        cell: (row) => (
          <span className="text-sm text-muted-foreground">
            {formatTemplateTableDate(row.updatedAt)}
          </span>
        ),
      },
      {
        id: "bodyPreview",
        header: "Preview",
        sortable: true,
        sortValue: (row) => row.bodyPreview ?? "",
        cell: (row) => (
          <span className="text-sm text-muted-foreground">
            {truncatePreview(row.bodyPreview)}
          </span>
        ),
      },
    ],
    [setTemplateRoute],
  );

  const deleteTarget = data?.items.find((item) => item.id === deleteId);

  if (isConnectionLoading) {
    return <Skeleton className="h-48 w-full" />;
  }

  if (!isConnected) {
    return (
      <EmptyState
        title="WhatsApp is not connected"
        description="Connect WhatsApp from Integrations before managing message templates."
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
    <>
      <div className="space-y-4">
        <FilterBar className="flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search templates…"
              className="sm:max-w-xs"
            />
            <SearchableSelect
              items={CATEGORY_OPTIONS}
              value={category}
              onValueChange={(value) => setCategory(value ?? "all")}
              searchable={false}
              triggerClassName="w-full sm:w-[180px]"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <SyncResourcesButton
              label="Sync templates"
              onSync={() => syncAllMutation.mutate()}
              isPending={syncAllMutation.isPending}
            />
            <ActionButton onClick={() => setTemplateRoute({ action: "create" })}>
              <Plus className="mr-2 size-4" />
              Create template
            </ActionButton>
          </div>
        </FilterBar>

        <DataTable
          columns={columns}
          data={data?.items ?? []}
          getRowId={(row) => row.id}
          isLoading={isLoading}
          emptyTitle="No templates yet"
          emptyDescription="Create a template or sync from Meta to get started."
          emptyAction={
            <ActionButton onClick={() => setTemplateRoute({ action: "create" })}>
              <Plus className="mr-2 size-4" />
              Create template
            </ActionButton>
          }
          rowActions={(row) => (
            <DataTableRowActions
              menuLabel={`Actions for ${row.name}`}
              actions={[
                {
                  label: "View",
                  onClick: () =>
                    setTemplateRoute({ action: "view", id: row.id }),
                },
                {
                  label: "Edit",
                  disabled: !canEditTemplateFromStatus(row.status),
                  onClick: () =>
                    setTemplateRoute({ action: "edit", id: row.id }),
                },
                {
                  label: "Duplicate",
                  onClick: () => {
                    void (async () => {
                      const detail = await getWhatsAppTemplate(row.id);
                      duplicateMutation.mutate(detail);
                    })();
                  },
                },
                {
                  label: "Refresh status",
                  onClick: () => syncOneMutation.mutate(row.id),
                },
                {
                  label: "Delete",
                  destructive: true,
                  disabled: !canDeleteTemplateFromStatus(row.status),
                  onClick: () => setDeleteId(row.id),
                },
              ]}
            />
          )}
        />

        <p className="text-xs text-muted-foreground">
          Templates are submitted to Meta for review. Rejected templates can be
          edited and resubmitted. Approved templates are available for outbound
          messaging outside the 24-hour window.
        </p>
      </div>

      <WhatsAppTemplateEditorDialog
        open={editorOpen}
        onOpenChange={(open) => {
          if (!open) setTemplateRoute({ action: null, id: null });
        }}
        mode={editorMode}
        template={
          editorMode === "edit" ? (selectedTemplate ?? null) : null
        }
      />

      <WhatsAppTemplateDetailSheet
        open={detailOpen}
        onOpenChange={(open) => {
          if (!open) setTemplateRoute({ action: null, id: null });
        }}
        template={selectedTemplate ?? null}
      />

      <ConfirmDeleteDialog
        open={Boolean(deleteId)}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null);
        }}
        title="Delete template"
        description={
          deleteTarget
            ? `Delete "${deleteTarget.name}" from Meta and this workspace?`
            : "Delete this template?"
        }
        isPending={deleteMutation.isPending}
        onConfirm={() => {
          if (!deleteId) return;
          deleteMutation.mutate(deleteId, {
            onSuccess: () => setDeleteId(null),
          });
        }}
      />
    </>
  );
}
