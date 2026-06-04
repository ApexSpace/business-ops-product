"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronsUpDown, Loader2, Plus, User } from "lucide-react";
import { QuickCreateContactDialog } from "@/features/contacts/components/quick-create-contact-dialog";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  formatContactPickerLine,
  parseContactSearchQuery,
} from "@/features/contacts/utils/contact-quick-create";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import {
  invalidateContactLists,
  invalidateContactPicker,
} from "@/lib/query/invalidation";
import { queryKeys } from "@/lib/query/keys";
import type { Contact, PaginatedResult } from "@/features/contacts/types";
import { getContact, listContacts } from "@/features/contacts/api/contacts.api";

export interface ContactPickerSelection {
  id: string;
  label: string;
  email?: string | null;
  phone?: string | null;
}

export interface ContactPickerProps {
  value: string;
  onValueChange: (contactId: string) => void;
  onContactSelect?: (contact: Contact) => void;
  disabled?: boolean;
  placeholder?: string;
  /** When set, picker is read-only and shows this contact. */
  locked?: boolean;
  lockedContact?: ContactPickerSelection;
  id?: string;
}

function contactToSelection(contact: Contact): ContactPickerSelection {
  return {
    id: contact.id,
    label: contact.label,
    email: contact.email,
    phone: contact.phone,
  };
}

function ContactPickerOption({
  contact,
  selected,
  onSelect,
}: {
  contact: ContactPickerSelection;
  selected: boolean;
  onSelect: () => void;
}) {
  const { primary, secondary } = formatContactPickerLine(contact);

  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      className={cn(
        "flex w-full items-start gap-2 rounded-sm px-2 py-2 text-left text-sm outline-none hover:bg-accent hover:text-accent-foreground",
        selected && "bg-accent/60",
      )}
      onClick={onSelect}
    >
      <User className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <span className="min-w-0 flex-1">
        <span className="block font-medium leading-snug">{primary}</span>
        {secondary ? (
          <span className="block truncate text-xs text-muted-foreground">
            {secondary}
          </span>
        ) : null}
      </span>
      {selected ? (
        <Check className="size-4 shrink-0 text-primary" aria-hidden />
      ) : null}
    </button>
  );
}

export function ContactPicker({
  value,
  onValueChange,
  onContactSelect,
  disabled = false,
  placeholder = "Search or add contact…",
  locked = false,
  lockedContact,
  id,
}: ContactPickerProps) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [selection, setSelection] = useState<ContactPickerSelection | null>(
    null,
  );

  const debouncedSearch = useDebouncedValue(search, 300);

  const { data: searchResults, isFetching } = useQuery({
    queryKey: queryKeys.contacts.search(debouncedSearch),
    queryFn: () =>
      listContacts({ page: 1, limit: 20, search: debouncedSearch || undefined }),
    enabled: open && !locked,
  });

  const { data: loadedContact } = useQuery({
    queryKey: queryKeys.contacts.detail(value),
    queryFn: () => getContact(value),
    enabled: !!value && !selection && !lockedContact && !locked,
  });

  useEffect(() => {
    if (lockedContact) {
      setSelection(lockedContact);
      return;
    }
    if (loadedContact && loadedContact.id === value) {
      setSelection(contactToSelection(loadedContact));
    }
  }, [lockedContact, loadedContact, value]);

  useEffect(() => {
    if (!value) {
      setSelection(null);
    }
  }, [value]);

  const contacts = searchResults?.items ?? [];

  const createPrefill = useMemo(
    () => parseContactSearchQuery(search),
    [search],
  );

  const createLabel = search.trim()
    ? `"${search.trim()}"`
    : "new contact";

  const displaySelection = locked && lockedContact ? lockedContact : selection;

  const handleSelect = (contact: ContactPickerSelection) => {
    setSelection(contact);
    onValueChange(contact.id);
    setOpen(false);
    setSearch("");
  };

  const handleCreated = (contact: Contact) => {
    const picked = contactToSelection(contact);
    setSelection(picked);
    onValueChange(contact.id);
    onContactSelect?.(contact);
    void invalidateContactPicker(queryClient);
    void invalidateContactLists(queryClient);
    setOpen(false);
    setSearch("");
  };

  if (locked && lockedContact) {
    const { primary, secondary } = formatContactPickerLine(lockedContact);
    return (
      <div
        id={id}
        className="flex h-[var(--control-height)] w-full items-center gap-2 rounded-md border border-input bg-muted/30 px-3 text-sm"
      >
        <User className="size-4 shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1 truncate">
          <span className="font-medium">{primary}</span>
          {secondary ? (
            <span className="ml-2 text-muted-foreground">{secondary}</span>
          ) : null}
        </span>
      </div>
    );
  }

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          id={id}
          disabled={disabled}
          className={cn(
            "flex h-[var(--control-height)] w-full items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 text-sm font-normal shadow-none outline-none transition-[border-color,box-shadow] hover:bg-muted/30 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50",
            !displaySelection && "text-muted-foreground",
          )}
        >
          <span className="flex min-w-0 flex-1 items-center gap-2 text-left">
            <User className="size-4 shrink-0 opacity-60" />
            <span className="truncate">
              {displaySelection
                ? formatContactPickerLine(displaySelection).primary
                : placeholder}
            </span>
          </span>
          <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-[var(--anchor-width)] min-w-[min(100%,320px)] p-0"
        >
          <div className="border-b p-2">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, or phone…"
              autoFocus
              className="h-9"
            />
          </div>
          <div
            className="max-h-60 overflow-y-auto p-1"
            role="listbox"
            aria-label="Contacts"
          >
            {isFetching ? (
              <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Searching…
              </div>
            ) : contacts.length === 0 && !debouncedSearch ? (
              <p className="px-2 py-6 text-center text-sm text-muted-foreground">
                Type to search contacts
              </p>
            ) : contacts.length === 0 ? (
              <p className="px-2 py-4 text-center text-sm text-muted-foreground">
                No matching contacts
              </p>
            ) : (
              contacts.map((contact) => {
                const picked = contactToSelection(contact);
                return (
                  <ContactPickerOption
                    key={contact.id}
                    contact={picked}
                    selected={value === contact.id}
                    onSelect={() => {
                      handleSelect(picked);
                      onContactSelect?.(contact);
                    }}
                  />
                );
              })
            )}
          </div>
          <div className="border-t p-1">
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-sm px-2 py-2 text-left text-sm font-medium text-primary outline-none hover:bg-accent"
              onClick={() => {
                setCreateOpen(true);
                setOpen(false);
              }}
            >
              <Plus className="size-4 shrink-0" />
              {search.trim()
                ? `Create ${createLabel} as new contact`
                : "Create new contact"}
            </button>
          </div>
        </PopoverContent>
      </Popover>

      <QuickCreateContactDialog
        key={search.trim() || "new-contact"}
        open={createOpen}
        onOpenChange={setCreateOpen}
        initialValues={createPrefill}
        createLabel={search.trim() ? search.trim() : undefined}
        onCreated={handleCreated}
      />
    </>
  );
}
