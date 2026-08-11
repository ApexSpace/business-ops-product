"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Download, Plus, Printer, Trash2, Upload } from "lucide-react";
import { DataTable, type DataTableColumn } from "@/components/data-display/data-table";
import { EntityDetailDrawer } from "@/components/layout/entity-detail-drawer";
import { EntityWorkspaceLayout } from "@/components/layout/entity-workspace-layout";
import { ListPrimaryAction } from "@/components/layout/list-primary-action";
import { ContactFormDialog } from "@/features/contacts/components/contact-form-dialog";
import {
  ContactDetailPanel,
  isContactDetailTab,
  type ContactDetailPanelActions,
  type ContactDetailTabId,
} from "@/features/contacts/components/contact-detail-panel";
import { SearchInput } from "@/components/forms/search-input";
import { ActionButton } from "@/components/ui/action-button";
import { Button } from "@/components/ui/button";
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
import { useListSearchParams } from "@/lib/hooks/use-list-search-params";
import {
  WORKSPACE_ACTIVE_ROW_CLASS,
  WORKSPACE_TABLE_CLASS,
} from "@/lib/design/workspace-tokens";
import { useEntitySelection } from "@/lib/routing/use-entity-selection";
import {
  invalidateContactLists,
  invalidateContactPicker,
} from "@/lib/query/invalidation";
import type { Contact } from "@/features/contacts/types";
import { toast } from "sonner";

const LIST_SCHEMA = {
  page: { default: "1" },
  search: { default: "" },
} as const;

const PAGE_LIMIT = 20;

function contactSubline(contact: Contact) {
  return (
    contact.phone?.trim() ||
    contact.email?.trim() ||
    contact.companyName?.trim() ||
    "No contact details yet"
  );
}

function BusinessContactsPageContent() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const contactPerms = useContactStaffPermissions();
  const { params, page, setParams } = useListSearchParams(LIST_SCHEMA);
  const debouncedSearch = useDebouncedValue(params.search);
  const [dialogOpen, setDialogOpen] = useState(false);
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

  const { data, isLoading } = useContactsList(listFilters);
  const canLoadDetail = Boolean(selectedId && contactPerms.canOpenProfiles);
  const { isLoading: detailLoading } = useContactDetail(
    canLoadDetail ? (selectedId ?? "") : "",
  );
  const contacts = data?.items ?? [];
  const total = data?.meta?.total ?? contacts.length;
  const selectedContact =
    contacts.find((contact) => contact.id === selectedId) ?? null;

  const handleActionsReady = useCallback((actions: ContactDetailPanelActions) => {
    panelActionsRef.current = actions;
  }, []);

  const columns = useMemo<DataTableColumn<Contact>[]>(
    () => [
      {
        id: "contact",
        header: "Contact",
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
            <div className="min-w-0">
              <p className="truncate font-medium">{row.label}</p>
              <p className="truncate text-xs text-muted-foreground">
                {contactSubline(row)}
              </p>
            </div>
          </div>
        ),
      },
      {
        id: "email",
        header: "Email",
        sortable: true,
        sortValue: (row) => row.email ?? "",
        cell: (row) => row.email?.trim() || "—",
      },
      {
        id: "phone",
        header: "Phone",
        sortable: true,
        sortValue: (row) => row.phone ?? "",
        className: "whitespace-nowrap",
        cell: (row) => row.phone?.trim() || "—",
      },
      {
        id: "company",
        header: "Company",
        sortable: true,
        sortValue: (row) => row.companyName ?? "",
        cell: (row) => row.companyName?.trim() || "—",
      },
    ],
    [],
  );

  return (
    <>
      <EntityWorkspaceLayout
        title="Contacts"
        description="Select a record to open contact details."
        search={
          <SearchInput
            value={params.search}
            onChange={(value) =>
              setParams({ search: value, page: "1" }, { resetPage: true })
            }
            placeholder="Search contacts…"
            className="min-w-0 flex-1"
          />
        }
        actions={
          contactPerms.canManage ? (
            <>
              <Button
                type="button"
                size="icon-sm"
                variant="outline"
                className="sm:hidden"
                aria-label="Import contacts"
                onClick={() => setImportOpen(true)}
              >
                <Upload className="size-4" />
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="hidden shrink-0 sm:inline-flex"
                onClick={() => setImportOpen(true)}
              >
                <Upload className="mr-1.5 size-4" />
                Import
              </Button>
              <Button
                type="button"
                size="icon-sm"
                variant="outline"
                className="sm:hidden"
                aria-label="Export contacts"
                disabled={exporting}
                onClick={async () => {
                  try {
                    setExporting(true);
                    await downloadDataExport(
                      "CONTACT",
                      debouncedSearch || undefined,
                    );
                    toast.success("Contacts exported");
                  } catch {
                    toast.error("Export failed");
                  } finally {
                    setExporting(false);
                  }
                }}
              >
                <Download className="size-4" />
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="hidden shrink-0 sm:inline-flex"
                disabled={exporting}
                onClick={async () => {
                  try {
                    setExporting(true);
                    await downloadDataExport(
                      "CONTACT",
                      debouncedSearch || undefined,
                    );
                    toast.success("Contacts exported");
                  } catch {
                    toast.error("Export failed");
                  } finally {
                    setExporting(false);
                  }
                }}
              >
                <Download className="mr-1.5 size-4" />
                Export
              </Button>
              <ListPrimaryAction
                label="New Contact"
                onClick={() => setDialogOpen(true)}
              />
            </>
          ) : null
        }
        footer={
          data?.meta ? (
            <ListPagination
              meta={data.meta}
              page={page}
              onPageChange={(p) => setParams({ page: String(p) })}
              label="contacts"
              compact
            />
          ) : contacts.length > 0 ? (
            `${contacts.length} of ${total} contact${total === 1 ? "" : "s"}`
          ) : undefined
        }
      >
        <DataTable
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
              <ActionButton onClick={() => setDialogOpen(true)}>
                <Plus className="mr-2 size-4" />
                Add contact
              </ActionButton>
            ) : undefined
          }
          className={WORKSPACE_TABLE_CLASS}
        />
      </EntityWorkspaceLayout>

      <EntityDetailDrawer
        open={isOpen && contactPerms.canOpenProfiles}
        onOpenChange={(open) => {
          if (!open) {
            clearSelection();
            setNoteComposerOpen(false);
          }
        }}
        width="split"
        title="Contact details"
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

      <ContactFormDialog
        open={dialogOpen || createFromQuery}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open && createFromQuery) {
            const next = new URLSearchParams(searchParams.toString());
            next.delete("action");
            const qs = next.toString();
            router.replace(qs ? `${pathname}?${qs}` : pathname, {
              scroll: false,
            });
          }
        }}
        contact={null}
        onSuccess={() => {
          void invalidateContactLists(queryClient);
          void invalidateContactPicker(queryClient);
        }}
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
