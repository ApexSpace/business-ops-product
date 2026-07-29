"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SearchInput } from "@/components/forms/search-input";
import { mergeContacts, listContacts } from "@/features/contacts/api/contacts.api";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import {
  invalidateContactDetail,
  invalidateContactLists,
  invalidateContactPicker,
} from "@/lib/query/invalidation";
import { queryKeys } from "@/lib/query/keys";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  keepContactId: string;
  keepContactLabel: string;
  onMerged?: () => void;
};

export function ContactMergeDialog({
  open,
  onOpenChange,
  keepContactId,
  keepContactLabel,
  onMerged,
}: Props) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedMergeId, setSelectedMergeId] = useState<string | null>(null);
  const debouncedSearch = useDebouncedValue(search);

  const { data } = useQuery({
    queryKey: queryKeys.contacts.list({
      page: 1,
      limit: 20,
      search: debouncedSearch || undefined,
    }),
    queryFn: () =>
      listContacts({ page: 1, limit: 20, search: debouncedSearch || undefined }),
    enabled: open,
  });

  const candidates = useMemo(
    () => (data?.items ?? []).filter((item) => item.id !== keepContactId),
    [data?.items, keepContactId],
  );

  const mutation = useMutation({
    mutationFn: () => mergeContacts(keepContactId, selectedMergeId!),
    onSuccess: () => {
      toast.success("Contacts merged");
      void invalidateContactLists(queryClient);
      void invalidateContactPicker(queryClient);
      void invalidateContactDetail(queryClient, keepContactId);
      if (selectedMergeId) {
        void invalidateContactDetail(queryClient, selectedMergeId);
      }
      setSelectedMergeId(null);
      setSearch("");
      onOpenChange(false);
      onMerged?.();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Merge into {keepContactLabel}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Choose a duplicate contact to merge. Its history is moved into this
          contact and the duplicate is removed.
        </p>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search contacts to merge…"
        />
        <div className="max-h-56 space-y-1 overflow-y-auto rounded-md border p-1">
          {candidates.length === 0 ? (
            <p className="px-2 py-3 text-sm text-muted-foreground">
              No matching contacts.
            </p>
          ) : (
            candidates.map((item) => (
              <button
                key={item.id}
                type="button"
                className={cn(
                  "flex w-full flex-col rounded-md px-2 py-2 text-left hover:bg-muted/70",
                  selectedMergeId === item.id && "bg-muted",
                )}
                onClick={() => setSelectedMergeId(item.id)}
              >
                <span className="text-sm font-medium">{item.label}</span>
                <span className="text-xs text-muted-foreground">
                  {item.email || item.phone || "No contact details"}
                </span>
              </button>
            ))
          )}
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!selectedMergeId || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            Merge contact
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
