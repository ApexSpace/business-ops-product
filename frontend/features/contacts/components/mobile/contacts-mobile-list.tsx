"use client";

import { MobileEntityListItem } from "@/components/mobile/mobile-entity-list-item";
import { MobileEntityListScreen } from "@/components/mobile/mobile-entity-list-screen";
import { ListPrimaryAction } from "@/components/layout/list-primary-action";
import { MobileAppBottomNav } from "@/components/shell/mobile-app-bottom-nav";
import type { Contact } from "@/features/contacts/types";

export interface ContactsMobileListProps {
  contacts: Contact[];
  isLoading?: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  selectedId: string | null;
  onSelect: (contact: Contact) => void;
  onOpenOptions: () => void;
  onCreate: () => void;
  canCreate?: boolean;
  canOpenProfiles?: boolean;
  emptyAction?: React.ReactNode;
  pagination?: {
    meta: { total: number; page: number; limit: number };
    page: number;
    onPageChange: (page: number) => void;
  };
  className?: string;
}

function contactMeta(contact: Contact): string {
  return contact.email?.trim() || "—";
}

function contactPhone(contact: Contact): string {
  return contact.phone?.trim() || "—";
}

export function ContactsMobileList({
  contacts,
  isLoading = false,
  search,
  onSearchChange,
  selectedId,
  onSelect,
  onOpenOptions,
  onCreate,
  canCreate = true,
  canOpenProfiles = true,
  emptyAction,
  pagination,
  className,
}: ContactsMobileListProps) {
  return (
    <MobileEntityListScreen
      title="Clients"
      search={search}
      onSearchChange={onSearchChange}
      onFilter={onOpenOptions}
      filterLabel="Contact options"
      onCreate={onCreate}
      createLabel="New contact"
      canCreate={canCreate}
      isLoading={isLoading}
      isEmpty={contacts.length === 0}
      loadingMessage="Loading clients…"
      emptyTitle="No contacts yet"
      emptyDescription="Add your first contact to start building your CRM."
      emptyAction={
        emptyAction ??
        (canCreate ? (
          <ListPrimaryAction
            label="New Contact"
            showIcon={false}
            onClick={onCreate}
          />
        ) : null)
      }
      pagination={
        pagination && contacts.length > 0
          ? {
              meta: pagination.meta,
              page: pagination.page,
              onPageChange: pagination.onPageChange,
              label: "contacts",
            }
          : undefined
      }
      bottomNav={<MobileAppBottomNav />}
      className={className}
    >
      <ul className="m-0 list-none p-0">
        {contacts.map((contact) => {
          const phone = contactPhone(contact);
          const meta = contactMeta(contact);
          return (
            <li key={contact.id}>
              <MobileEntityListItem
                primary={contact.label}
                meta={meta}
                amount={phone}
                active={selectedId === contact.id}
                onClick={() => {
                  if (!canOpenProfiles) return;
                  onSelect(contact);
                }}
                aria-label={`${contact.label}, ${phone}, ${meta}`}
              />
            </li>
          );
        })}
      </ul>
    </MobileEntityListScreen>
  );
}
