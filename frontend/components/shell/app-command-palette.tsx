"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Command } from "cmdk";
import {
  Calendar,
  Contact,
  CreditCard,
  Package,
  Search,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { globalSearch, type GlobalSearchResult } from "@/lib/api/search.api";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import { queryKeys } from "@/lib/query/keys";
import { cn } from "@/lib/utils";
import {
  groupSearchResults,
  SEARCH_RESULT_GROUPS,
} from "./command-palette-utils";

const TYPE_ICONS = {
  contact: Contact,
  appointment: Calendar,
  invoice: CreditCard,
  product: Package,
} as const;

interface AppCommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  searchPlaceholder?: string;
}

function CommandPaletteResultRow({ item }: { item: GlobalSearchResult }) {
  const Icon = TYPE_ICONS[item.type];

  return (
    <>
      <span
        className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted/60"
        aria-hidden
      >
        <Icon className="size-4 text-muted-foreground" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium leading-snug">{item.label}</p>
        {item.subtitle ? (
          <p className="truncate text-xs text-muted-foreground">{item.subtitle}</p>
        ) : null}
      </div>
    </>
  );
}

export function AppCommandPalette({
  open,
  onOpenChange,
  searchPlaceholder = "Search contacts, appointments, invoices, products…",
}: AppCommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 250);
  const trimmedQuery = debouncedQuery.trim();
  const hasQuery = trimmedQuery.length >= 2;

  useEffect(() => {
    if (!open) {
      setQuery("");
    }
  }, [open]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: queryKeys.search.global(trimmedQuery),
    queryFn: () => globalSearch(trimmedQuery, 20),
    enabled: open && hasQuery,
  });

  const groupedResults = data?.items ? groupSearchResults(data.items) : [];
  const showLoading = hasQuery && (isLoading || isFetching);
  const showEmpty = hasQuery && !showLoading && groupedResults.length === 0;

  const navigate = (href: string) => {
    onOpenChange(false);
    router.push(href);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          "top-[18vh] max-h-[min(70vh,calc(100dvh-8rem))] w-[calc(100%-2rem)] max-w-[600px] -translate-y-0 gap-0 overflow-hidden p-0",
          "data-open:zoom-in-[0.99] data-closed:zoom-out-[0.99]",
        )}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Search</DialogTitle>
          <DialogDescription>
            Search contacts, appointments, invoices, and products.
          </DialogDescription>
        </DialogHeader>
        <Command
          shouldFilter={false}
          loop
          className="flex max-h-[min(70vh,calc(100dvh-8rem))] flex-col bg-popover"
        >
          <div
            className="flex items-center gap-2 border-b border-border/80 px-3"
            cmdk-input-wrapper=""
          >
            <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            <Command.Input
              value={query}
              onValueChange={setQuery}
              placeholder={searchPlaceholder}
              aria-label="Search"
              autoFocus
              className="flex h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <Command.List
            aria-label="Search results"
            className="max-h-[min(52vh,calc(100dvh-14rem))] overflow-y-auto p-2"
          >
            {!hasQuery ? (
              <div className="px-2 py-8 text-center">
                <p className="text-sm text-muted-foreground">
                  Type to search across your workspace
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {SEARCH_RESULT_GROUPS.map((group) => group.label).join(" · ")}
                </p>
              </div>
            ) : showLoading ? (
              <p className="px-2 py-8 text-center text-sm text-muted-foreground">
                Searching…
              </p>
            ) : showEmpty ? (
              <Command.Empty className="px-2 py-8 text-center text-sm text-muted-foreground">
                No results found
              </Command.Empty>
            ) : (
              groupedResults.map((group) => (
                <Command.Group
                  key={group.type}
                  heading={group.label}
                  className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-muted-foreground"
                >
                  {group.items.map((item) => (
                    <Command.Item
                      key={`${item.type}-${item.id}`}
                      value={`${item.type}-${item.id}-${item.label}`}
                      onSelect={() => navigate(item.href)}
                      className={cn(
                        "flex cursor-pointer items-center gap-3 rounded-md px-2 py-2.5 text-sm outline-none",
                        "aria-selected:bg-muted",
                      )}
                    >
                      <CommandPaletteResultRow item={item} />
                    </Command.Item>
                  ))}
                </Command.Group>
              ))
            )}
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
