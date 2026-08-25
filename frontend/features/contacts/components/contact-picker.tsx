"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Loader2, Plus, User } from "lucide-react";
import { QuickCreateContactDialog } from "@/features/contacts/components/quick-create-contact-dialog";
import { DrawerPlusSquareButton } from "@/components/drawer/drawer-icons";
import {
  Combobox,
  ComboboxFieldInput,
  COMBOBOX_EMPTY_CLASS,
  COMBOBOX_ITEM_CLASS,
  COMBOBOX_STATUS_CLASS,
  ComboboxPopup,
} from "@/components/ui/combobox";
import {
  APPOINTMENT_DRAWER_FIELD_CLASS,
} from "@/features/appointments/styles/appointment-drawer-tokens";
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
import type { Contact } from "@/features/contacts/types";
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
  triggerClassName?: string;
  /**
   * `drawer` — hide User / ChevronsUpDown; purple plus only (appointment sidebar).
   */
  variant?: "default" | "drawer";
  /** Contacts API path prefix (business `contacts` or `platform/contacts`). */
  apiBase?: string;
}

function contactToSelection(contact: Contact): ContactPickerSelection {
  return {
    id: contact.id,
    label: contact.label,
    email: contact.email,
    phone: contact.phone,
  };
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
  triggerClassName,
  variant = "default",
  apiBase = "contacts",
}: ContactPickerProps) {
  const queryClient = useQueryClient();
  const isDrawer = variant === "drawer";
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [selection, setSelection] = useState<ContactPickerSelection | null>(
    null,
  );

  const debouncedSearch = useDebouncedValue(search, 300);

  const { data: searchResults, isFetching } = useQuery({
    queryKey: queryKeys.contacts.search(debouncedSearch, apiBase),
    queryFn: () =>
      listContacts(
        { page: 1, limit: 20, search: debouncedSearch || undefined },
        apiBase,
      ),
    enabled: open && !locked,
  });

  const { data: loadedContact } = useQuery({
    queryKey: queryKeys.contacts.detail(value, apiBase),
    queryFn: () => getContact(value, apiBase),
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
  const contactItems = useMemo(
    () => contacts.map(contactToSelection),
    [contacts],
  );

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
    void invalidateContactPicker(queryClient, apiBase);
    void invalidateContactLists(queryClient, apiBase);
    setOpen(false);
    setSearch("");
  };

  if (locked && lockedContact) {
    const { primary, secondary } = formatContactPickerLine(lockedContact);
    return (
      <div
        id={id}
        className={cn(
          "flex h-11 w-full items-center gap-2.5 rounded-[10px] border-[1.5px] border-input bg-muted/30 px-3 text-[13.5px]",
          triggerClassName,
        )}
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

  const createButton =
    !locked && !disabled ? (
      isDrawer ? (
        <DrawerPlusSquareButton
          aria-label="Create new client"
          stopPropagation
          onClick={() => setCreateOpen(true)}
        />
      ) : (
        <button
          type="button"
          aria-label="Create new client"
          className="inline-flex size-6 shrink-0 items-center justify-center rounded-[4px] bg-[#7E3BED] text-white hover:bg-[#7135D5]"
          onClick={() => setCreateOpen(true)}
        >
          <Plus className="size-3.5" strokeWidth={2.5} aria-hidden />
        </button>
      )
    ) : null;

  return (
    <>
      <div className={cn("flex w-full min-w-0 items-center", !isDrawer && "gap-2")}>
        <Combobox.Root
          items={contactItems}
          filteredItems={contactItems}
          filter={null}
          value={displaySelection}
          onValueChange={(next) => {
            if (!next) return;
            handleSelect(next);
            const full = contacts.find((contact) => contact.id === next.id);
            if (full) onContactSelect?.(full);
          }}
          disabled={disabled}
          modal={false}
          autoHighlight
          autoComplete="off"
          open={open}
          onOpenChange={(next) => {
            setOpen(next);
            if (!next) setSearch("");
          }}
          onInputValueChange={(next) => {
            setSearch(next);
            if (!open) setOpen(true);
          }}
          itemToStringLabel={(item) =>
            formatContactPickerLine(item).primary
          }
          itemToStringValue={(item) => item.id}
          isItemEqualToValue={(left, right) => left.id === right.id}
        >
          <div className="relative w-full min-w-0 flex-1">
            {!isDrawer ? (
              <User className="pointer-events-none absolute top-1/2 left-3 z-10 size-4 -translate-y-1/2 opacity-60" />
            ) : null}
            <ComboboxFieldInput
              id={id}
              disabled={disabled}
              placeholder={placeholder}
              showIcon={!isDrawer}
              className={cn(
                isDrawer
                  ? cn(APPOINTMENT_DRAWER_FIELD_CLASS, "pr-10 font-normal")
                  : "pl-9",
                triggerClassName,
              )}
            />
            {isDrawer ? (
              <div className="absolute top-1/2 right-1.5 z-10 -translate-y-1/2">
                {createButton}
              </div>
            ) : null}
          </div>
          <ComboboxPopup>
            {isFetching ? (
              <Combobox.Status className={COMBOBOX_STATUS_CLASS}>
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin" />
                  Searching…
                </span>
              </Combobox.Status>
            ) : (
              <Combobox.Empty className={COMBOBOX_EMPTY_CLASS}>
                {debouncedSearch
                  ? "No matching contacts"
                  : "Type to search contacts"}
              </Combobox.Empty>
            )}
            <Combobox.List>
              {(item: ContactPickerSelection) => {
                const { primary, secondary } = formatContactPickerLine(item);
                return (
                  <Combobox.Item
                    key={item.id}
                    value={item}
                    className={cn(COMBOBOX_ITEM_CLASS, "items-start pr-8")}
                  >
                    <User className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium leading-snug">
                        {primary}
                      </span>
                      {secondary ? (
                        <span className="block truncate text-xs text-muted-foreground">
                          {secondary}
                        </span>
                      ) : null}
                    </span>
                    {value === item.id ? (
                      <Check
                        className="mt-0.5 size-4 shrink-0 text-primary"
                        aria-hidden
                      />
                    ) : null}
                  </Combobox.Item>
                );
              }}
            </Combobox.List>
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
          </ComboboxPopup>
        </Combobox.Root>
        {!isDrawer ? createButton : null}
      </div>

      <QuickCreateContactDialog
        key={search.trim() || "new-contact"}
        open={createOpen}
        onOpenChange={setCreateOpen}
        initialValues={createPrefill}
        createLabel={search.trim() ? search.trim() : undefined}
        apiBase={apiBase}
        onCreated={handleCreated}
      />
    </>
  );
}
