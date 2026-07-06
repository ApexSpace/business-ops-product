"use client";

import { Suspense, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";
import { EmptyState } from "@/components/data-display/empty-state";
import { ContactFormDialog } from "@/features/contacts/components/contact-form-dialog";
import { ContactDetailPanel } from "@/features/contacts/components/contact-detail-panel";
import { SearchInput } from "@/components/forms/search-input";
import { ActionButton } from "@/components/ui/action-button";
import { Button } from "@/components/ui/button";
import { ListPagination } from "@/components/ui/list-pagination";
import { ProfileAvatar } from "@/components/ui/profile-avatar";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Can } from "@/features/auth/permissions/can";
import { PERMISSIONS } from "@/features/auth/permissions/permissions";
import { useContactsList } from "@/features/contacts/hooks/use-contacts-list";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import { useIsMobile } from "@/lib/hooks/use-mobile";
import { useListSearchParams } from "@/lib/hooks/use-list-search-params";
import {
  invalidateContactLists,
  invalidateContactPicker,
} from "@/lib/query/invalidation";
import type { Contact } from "@/features/contacts/types";
import { cn } from "@/lib/utils";
import "@/features/contacts/styles/contacts-split-layout.css";

const LIST_SCHEMA = {
  page: { default: "1" },
  search: { default: "" },
  contact: { default: "" },
  tab: { default: "timeline" },
} as const;

const PAGE_LIMIT = 20;
const CONTACT_DETAIL_TABS = ["timeline", "wallet", "memberships", "adjustments"] as const;

function isContactDetailTab(value: string): value is (typeof CONTACT_DETAIL_TABS)[number] {
  return CONTACT_DETAIL_TABS.includes(
    value as (typeof CONTACT_DETAIL_TABS)[number],
  );
}

function contactSubline(contact: Contact) {
  return (
    contact.phone?.trim() ||
    contact.email?.trim() ||
    contact.companyName?.trim() ||
    "No contact details yet"
  );
}

function ContactListRow({
  contact,
  isSelected,
  onSelect,
}: {
  contact: Contact;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn("contacts-master-item", isSelected && "selected")}
    >
      <ProfileAvatar
        name={contact.label}
        avatarUrl={contact.avatarAssetId ? contact.avatarUrl : null}
        size="sm"
        className={cn(
          "!size-[34px]",
          isSelected && "ring-2 ring-primary ring-offset-2 ring-offset-card",
        )}
      />
      <div className="min-w-0 flex-1">
        <p className={cn("truncate font-medium", isSelected && "text-primary")}>
          {contact.label}
        </p>
        <p className="truncate text-sm text-muted-foreground">{contactSubline(contact)}</p>
      </div>
    </button>
  );
}

function ContactListSkeleton() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={`contact-list-skeleton-${index}`}
          className="flex gap-3 border-b border-border px-5 py-3.5"
        >
          <Skeleton className="size-[34px] rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3.5 w-32" />
            <Skeleton className="h-3 w-40" />
          </div>
        </div>
      ))}
    </>
  );
}

function BusinessContactsPageContent() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { params, page, setParams } = useListSearchParams(LIST_SCHEMA);
  const debouncedSearch = useDebouncedValue(params.search);
  const [dialogOpen, setDialogOpen] = useState(false);
  const createFromQuery = searchParams.get("action") === "create";
  const isMobile = useIsMobile();
  const { state: sidebarState } = useSidebar();

  const listFilters = {
    page,
    limit: PAGE_LIMIT,
    search: debouncedSearch || undefined,
  };

  const { data, isLoading } = useContactsList(listFilters);
  const selectedContactId = params.contact || null;
  const activeTab = isContactDetailTab(params.tab) ? params.tab : "timeline";

  return (
    <div
      className={cn(
        "contacts-split-layout contacts-workspace flex h-full min-h-0 flex-1 flex-col overflow-hidden",
        isMobile && "contacts-workspace--list-only",
      )}
      data-sidebar={sidebarState}
    >
      <div
        className={cn(
          "contacts-split-view flex min-h-0 flex-1 flex-col overflow-hidden md:flex-row md:gap-4",
          isMobile && "contacts-split-view--list-only",
        )}
      >
        <aside className="contacts-panel-card contacts-master flex min-h-0 w-full max-w-none flex-1 flex-col md:w-[300px] md:max-w-[300px] md:flex-none">
          <div className="contacts-master-head">
            <h2 className="text-lg font-semibold">Contacts</h2>
            <p className="text-sm text-muted-foreground">
              Select a record to open the details
            </p>
            <div className="mt-3 flex items-center gap-2">
              <SearchInput
                value={params.search}
                onChange={(value) =>
                  setParams({ search: value, page: "1" }, { resetPage: true })
                }
                placeholder="Search contacts…"
                className="min-w-0 flex-1"
              />
              <Can permission={PERMISSIONS["contacts.create"]}>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="size-[var(--control-height)] shrink-0 rounded-[var(--radius-control)]"
                  onClick={() => setDialogOpen(true)}
                  aria-label="Add contact"
                >
                  <Plus className="size-4" />
                </Button>
              </Can>
            </div>
          </div>

          <div className="contacts-master-list">
            {isLoading ? (
              <ContactListSkeleton />
            ) : (data?.items.length ?? 0) === 0 ? (
              <div className="p-5">
                <EmptyState
                  compact
                  title="No contacts yet"
                  description="Add your first contact to start building your CRM."
                  action={
                    <ActionButton onClick={() => setDialogOpen(true)}>
                      <Plus className="mr-2 size-4" />
                      Add contact
                    </ActionButton>
                  }
                />
              </div>
            ) : (
              (data?.items ?? []).map((contact) => (
                <ContactListRow
                  key={contact.id}
                  contact={contact}
                  isSelected={selectedContactId === contact.id}
                  onSelect={() =>
                    setParams({
                      contact: contact.id,
                      tab:
                        selectedContactId === contact.id ? activeTab : "timeline",
                    })
                  }
                />
              ))
            )}
          </div>

          {data?.meta ? (
            <div className="contacts-master-footer">
              <ListPagination
                meta={data.meta}
                page={page}
                onPageChange={(p) => setParams({ page: String(p) })}
                label="contacts"
                compact
              />
            </div>
          ) : null}
        </aside>

        {selectedContactId && !isMobile ? (
          <ContactDetailPanel
            contactId={selectedContactId}
            activeSection={activeTab}
            onSectionChange={(tab) => setParams({ tab })}
            onContactDeleted={() => setParams({ contact: "", tab: "timeline" })}
          />
        ) : !isMobile ? (
          <section className="contacts-panel-card contacts-detail-empty">
            <EmptyState
              title="Select a contact"
              description="Choose a contact from the master list to view their timeline, wallet, memberships and packages, and adjustments here."
            />
          </section>
        ) : null}
      </div>

      {isMobile ? (
        <Sheet
          open={!!selectedContactId}
          onOpenChange={(open) => {
            if (!open) {
              setParams({ contact: "", tab: "timeline" });
            }
          }}
        >
          <SheetContent
            side="right"
            className="flex h-[100dvh] max-h-[100dvh] w-full max-w-none flex-col border-l-0 bg-background p-0 shadow-none"
            showCloseButton
          >
            <SheetHeader className="shrink-0 border-b border-border bg-card px-4 py-3">
              <SheetTitle>Contact details</SheetTitle>
              <SheetDescription>
                Review the selected contact without leaving the master list.
              </SheetDescription>
            </SheetHeader>
            <SheetBody className="flex min-h-0 flex-1 flex-col overflow-hidden px-3 py-3">
              {selectedContactId ? (
                <ContactDetailPanel
                  variant="drawer"
                  className="min-h-0 flex-1"
                  contactId={selectedContactId}
                  activeSection={activeTab}
                  onSectionChange={(tab) => setParams({ tab })}
                  onContactDeleted={() =>
                    setParams({ contact: "", tab: "timeline" })
                  }
                />
              ) : null}
            </SheetBody>
          </SheetContent>
        </Sheet>
      ) : null}

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
    </div>
  );
}

export function ContactsPage() {
  return (
    <Suspense
      fallback={
        <div className="contacts-split-layout contacts-workspace flex h-full min-h-0 flex-1 flex-col overflow-hidden contacts-workspace--list-only">
          <div className="contacts-split-view contacts-split-view--list-only flex min-h-0 flex-1 flex-col overflow-hidden p-3">
            <Skeleton className="min-h-0 flex-1 rounded-xl" />
          </div>
        </div>
      }
    >
      <BusinessContactsPageContent />
    </Suspense>
  );
}
