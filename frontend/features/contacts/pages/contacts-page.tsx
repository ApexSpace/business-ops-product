"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Plus, Printer, Trash2 } from "lucide-react";
import { ApiErrorState } from "@/components/data-display/api-error-state";
import { type DataTableColumn } from "@/components/data-display/data-table";
import { EntityDetailDrawer } from "@/components/layout/entity-detail-drawer";
import { EntityListLayout } from "@/components/layout/entity-list-layout";
import { ClientDetailsDrawer } from "@/features/contacts/components/client-details-drawer";
import {
  CONTACTS_DRAWER_MOBILE_SHELL_CLASS,
  CONTACTS_DRAWER_SHELL_CLASS,
  CONTACTS_DRAWER_SPINE_LABELS,
} from "@/features/contacts/styles/contacts-drawer-tokens";
import {
  ContactsOptionsDrawer,
  EMPTY_CONTACTS_OPTIONS,
  type ContactsOptionsValues,
} from "@/features/contacts/components/contacts-options-drawer";
import {
  ContactDetailPanel,
  isContactDetailTab,
  type ContactDetailPanelActions,
  type ContactDetailTabId,
} from "@/features/contacts/components/contact-detail-panel";
import { ActionButton } from "@/components/ui/action-button";
import { ListPagination } from "@/components/ui/list-pagination";
import { ProfileAvatar } from "@/components/ui/profile-avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { ContactMergeDialog } from "@/features/contacts/components/contact-merge-dialog";
import { DataImportWizard } from "@/features/data-io/components/data-import-wizard";
import { downloadDataExport } from "@/features/data-io/api/data-io.api";
import { useContactDetail } from "@/features/contacts/hooks/use-contact-detail";
import { useContactsList } from "@/features/contacts/hooks/use-contacts-list";
import { useContactStaffPermissions } from "@/features/contacts/hooks/use-contact-staff-permissions";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import { useIsMobile } from "@/lib/hooks/use-mobile";
import { useListSearchParams } from "@/lib/hooks/use-list-search-params";
import { WORKSPACE_ACTIVE_ROW_CLASS } from "@/lib/design/workspace-tokens";
import { useEntitySelection } from "@/lib/routing/use-entity-selection";
import {
  invalidateContactLists,
  invalidateContactPicker,
} from "@/lib/query/invalidation";
import type { Contact } from "@/features/contacts/types";
import { ContactsMobileList } from "@/features/contacts/components/mobile/contacts-mobile-list";
import { toast } from "sonner";

const LIST_SCHEMA = {
  page: { default: "1" },
  search: { default: "" },
} as const;

const PAGE_LIMIT = 20;

function BusinessContactsPageContent() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const contactPerms = useContactStaffPermissions();
  const isMobile = useIsMobile();
  const { params, page, setParams } = useListSearchParams(LIST_SCHEMA);
  const debouncedSearch = useDebouncedValue(params.search);
  const [createOpen, setCreateOpen] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [optionsValues, setOptionsValues] = useState<ContactsOptionsValues>(
    EMPTY_CONTACTS_OPTIONS,
  );
  const [mergeOpen, setMergeOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [noteComposerOpen, setNoteComposerOpen] = useState(false);
  const createFromQuery = searchParams.get("action") === "create";
  const panelActionsRef = useRef<ContactDetailPanelActions | null>(null);

  const {
    selectedId,
    tab,
    isOpen,
    setSelectedId,
    setTab,
    clearSelection,
  } = useEntitySelection({
    legacyIdParams: ["contact"],
    defaultTab: "timeline",
  });

  const activeTab: ContactDetailTabId =
    tab && isContactDetailTab(tab) ? tab : "timeline";

  useEffect(() => {
    if (!isOpen) {
      setNoteComposerOpen(false);
    }
  }, [isOpen, selectedId]);

  useEffect(() => {
    if (selectedId && !contactPerms.canOpenProfiles) {
      clearSelection();
      setNoteComposerOpen(false);
    }
  }, [selectedId, contactPerms.canOpenProfiles, clearSelection]);

  const handleNoteComposerOpenChange = useCallback(
    (open: boolean) => {
      if (open) {
        setTab("timeline");
      }
      setNoteComposerOpen(open);
    },
    [setTab],
  );

  const listFilters = {
    page,
    limit: PAGE_LIMIT,
    search: debouncedSearch || undefined,
  };

  const { data, isLoading, isError, error, refetch } =
    useContactsList(listFilters);
  const canLoadDetail = Boolean(selectedId && contactPerms.canOpenProfiles);
  const { isLoading: detailLoading } = useContactDetail(
    canLoadDetail ? (selectedId ?? "") : "",
  );
  const contacts = data?.items ?? [];
  const selectedContact =
    contacts.find((contact) => contact.id === selectedId) ?? null;

  const handleActionsReady = useCallback((actions: ContactDetailPanelActions) => {
    panelActionsRef.current = actions;
  }, []);

  const openCreate = useCallback(() => setCreateOpen(true), []);

  const handleExport = useCallback(async () => {
    try {
      setExporting(true);
      await downloadDataExport("CONTACT", debouncedSearch || undefined);
      toast.success("Contacts exported");
    } catch {
      toast.error("Export failed");
    } finally {
      setExporting(false);
    }
  }, [debouncedSearch]);

  const columns = useMemo<DataTableColumn<Contact>[]>(
    () => [
      {
        id: "contact",
        header: "Name",
        sortable: true,
        sortValue: (row) => row.label,
        cell: (row) => (
          <div className="flex min-w-0 items-center gap-2.5">
            <ProfileAvatar
              name={row.label}
              avatarUrl={row.avatarAssetId ? row.avatarUrl : null}
              size="sm"
              className="!size-8 shrink-0"
            />
            <p className="truncate font-medium text-[#4A4A4A]">{row.label}</p>
          </div>
        ),
      },
      {
        id: "email",
        header: "Email",
        sortable: true,
        sortValue: (row) => row.email ?? "",
        cell: (row) => (
          <span className="truncate text-[#4A4A4A]">
            {row.email?.trim() || "—"}
          </span>
        ),
      },
      {
        id: "phone",
        header: "Phone",
        sortable: true,
        sortValue: (row) => row.phone ?? "",
        className: "whitespace-nowrap",
        cell: (row) => (
          <span className="text-[#4A4A4A]">{row.phone?.trim() || "—"}</span>
        ),
      },
    ],
    [],
  );

  return (
    <>
      {isMobile ? (
        <ContactsMobileList
          contacts={contacts}
          isLoading={isLoading}
          search={params.search}
          onSearchChange={(value) =>
            setParams({ search: value, page: "1" }, { resetPage: true })
          }
          selectedId={selectedId}
          onSelect={(row) => {
            if (!contactPerms.canOpenProfiles) return;
            if (row.id !== selectedId) {
              setTab("timeline");
            }
            setSelectedId(row.id);
          }}
          onOpenOptions={() => setOptionsOpen(true)}
          onCreate={openCreate}
          canCreate={contactPerms.canManage}
          canOpenProfiles={contactPerms.canOpenProfiles}
          pagination={
            data?.meta && contacts.length > 0
              ? {
                  meta: data.meta,
                  page,
                  onPageChange: (p) => setParams({ page: String(p) }),
                }
              : undefined
          }
        />
      ) : (
      <EntityListLayout
        title="Contacts"
        description="Select a record to open contact details."
        addButtonLabel="New Contact"
        onAdd={contactPerms.canManage ? openCreate : undefined}
        searchPlaceholder="Search"
        searchValue={params.search}
        onSearchChange={(value) =>
          setParams({ search: value, page: "1" }, { resetPage: true })
        }
        filterAriaLabel="Contact options"
        onFilterClick={() => setOptionsOpen(true)}
        footer={
          data?.meta ? (
            <ListPagination
              meta={data.meta}
              page={page}
              onPageChange={(p) => setParams({ page: String(p) })}
              label="contacts"
            />
          ) : undefined
        }
        error={
          isError ? (
            <ApiErrorState error={error} onRetry={() => void refetch()} />
          ) : undefined
        }
        columns={columns}
        data={contacts}
        getRowId={(row) => row.id}
        isLoading={isLoading}
        density="compact"
        activeRowId={selectedId}
        onRowClick={(row) => {
          if (!contactPerms.canOpenProfiles) return;
          if (row.id !== selectedId) {
            setTab("timeline");
          }
          setSelectedId(row.id);
        }}
        getRowClassName={(row) =>
          contactPerms.canOpenProfiles && selectedId === row.id
            ? WORKSPACE_ACTIVE_ROW_CLASS
            : undefined
        }
        emptyTitle="No contacts yet"
        emptyDescription="Add your first contact to start building your CRM."
        emptyAction={
          contactPerms.canManage ? (
            <ActionButton onClick={openCreate}>
              <Plus className="mr-2 size-4" />
              Add contact
            </ActionButton>
          ) : undefined
        }
      />
      )}

      <EntityDetailDrawer
        open={isOpen && contactPerms.canOpenProfiles}
        onOpenChange={(open) => {
          if (!open) {
            clearSelection();
            setNoteComposerOpen(false);
          }
        }}
        width="split"
        chrome={isMobile ? "mobile-brand" : "default"}
        spineLabel={
          isMobile ? undefined : CONTACTS_DRAWER_SPINE_LABELS.clientDetails
        }
        className={
          isMobile ? CONTACTS_DRAWER_MOBILE_SHELL_CLASS : CONTACTS_DRAWER_SHELL_CLASS
        }
        title="Client Details"
        isLoading={detailLoading}
        fullBleed
        bodyClassName="flex flex-col !overflow-hidden"
        overflowActions={
          selectedId && contactPerms.canOpenProfiles
            ? [
                {
                  id: "print",
                  label: "Print upcoming appointments",
                  icon: <Printer className="size-3.5" />,
                  onSelect: () => panelActionsRef.current?.printAppointments(),
                },
                ...(contactPerms.canDeleteMerge
                  ? [
                      {
                        id: "merge",
                        label: "Merge contact…",
                        onSelect: () => setMergeOpen(true),
                      },
                      {
                        id: "delete",
                        label: "Delete",
                        icon: <Trash2 className="size-3.5" />,
                        destructive: true,
                        onSelect: () => panelActionsRef.current?.openDelete(),
                      },
                    ]
                  : []),
              ]
            : undefined
        }
      >
        {selectedId && contactPerms.canOpenProfiles ? (
          <ContactDetailPanel
            embedded
            contactId={selectedId}
            activeSection={activeTab}
            onSectionChange={(section) => setTab(section)}
            onActionsReady={handleActionsReady}
            noteComposerOpen={noteComposerOpen}
            onNoteComposerOpenChange={handleNoteComposerOpenChange}
            onContactDeleted={() => {
              clearSelection();
              setNoteComposerOpen(false);
            }}
          />
        ) : null}
      </EntityDetailDrawer>

      <ClientDetailsDrawer
        open={createOpen || createFromQuery}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open && createFromQuery) {
            const next = new URLSearchParams(searchParams.toString());
            next.delete("action");
            const qs = next.toString();
            router.replace(qs ? `${pathname}?${qs}` : pathname, {
              scroll: false,
            });
          }
        }}
        onSuccess={() => {
          void invalidateContactLists(queryClient);
          void invalidateContactPicker(queryClient);
        }}
      />

      <ContactsOptionsDrawer
        open={optionsOpen}
        onOpenChange={setOptionsOpen}
        values={optionsValues}
        downloadPending={exporting}
        onApply={(next) => {
          setOptionsValues(next);
          if (next.tag.trim() || next.referredBy.trim()) {
            const q = next.tag.trim() || next.referredBy.trim();
            setParams({ search: q, page: "1" }, { resetPage: true });
          }
          toast.success("Filters applied");
        }}
        onDownload={() => {
          void handleExport();
        }}
        onImport={() => setImportOpen(true)}
      />

      {selectedId && selectedContact ? (
        <ContactMergeDialog
          open={mergeOpen}
          onOpenChange={setMergeOpen}
          keepContactId={selectedId}
          keepContactLabel={selectedContact.label}
          onMerged={() => {
            void invalidateContactLists(queryClient);
          }}
        />
      ) : null}

      <DataImportWizard
        open={importOpen}
        onOpenChange={(open) => {
          setImportOpen(open);
          if (!open) {
            void invalidateContactLists(queryClient);
            void invalidateContactPicker(queryClient);
          }
        }}
        entityType="CONTACT"
        title="Import contacts"
      />
    </>
  );
}

export function ContactsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden p-6">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="mt-4 min-h-0 flex-1 rounded-xl" />
        </div>
      }
    >
      <BusinessContactsPageContent />
    </Suspense>
  );
}
