"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { ConfirmDeleteDialog } from "@/components/forms/confirm-delete-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  createCannedResponse,
  deleteCannedResponse,
  listCannedResponses,
  updateCannedResponse,
  type CannedResponse,
} from "@/features/conversations/api/canned-responses.api";
import { useConversationsHost } from "@/features/conversations/conversations-host-context";
import {
  getRecentQuickReplyIds,
  markQuickReplyUsed,
  sortQuickReplies,
  type QuickReplySortMode,
} from "@/features/conversations/utils/quick-reply-recent";
import { queryKeys } from "@/lib/query/keys";
import { cn } from "@/lib/utils";

const BODY_MAX_LENGTH = 4000;
const TITLE_MAX_LENGTH = 120;
const NEW_REPLY_ID = "__new__";

type EditorMode =
  | { type: "preview"; id: string }
  | { type: "create" }
  | { type: "edit"; id: string };

interface QuickRepliesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUseResponse: (body: string) => void;
}

export function QuickRepliesDialog({
  open,
  onOpenChange,
  onUseResponse,
}: QuickRepliesDialogProps) {
  const { cannedApiBase } = useConversationsHost();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] = useState<QuickReplySortMode>("recent");
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editor, setEditor] = useState<EditorMode | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftBody, setDraftBody] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: items = [], isLoading } = useQuery({
    queryKey: queryKeys.cannedResponses.list(cannedApiBase),
    queryFn: () => listCannedResponses(cannedApiBase),
    enabled: open,
  });

  useEffect(() => {
    if (!open) return;
    setRecentIds(getRecentQuickReplyIds());
    setSearch("");
    setSortMode("recent");
    setEditor(null);
    setDraftTitle("");
    setDraftBody("");
    setDeleteId(null);
  }, [open]);

  useEffect(() => {
    if (!open || editor?.type === "create") return;
    if (items.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !items.some((item) => item.id === selectedId)) {
      setSelectedId(items[0]!.id);
    }
  }, [open, items, selectedId, editor]);

  const invalidate = () => {
    void queryClient.invalidateQueries({
      queryKey: queryKeys.cannedResponses.all(cannedApiBase),
    });
  };

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    const matched = query
      ? items.filter(
          (item) =>
            item.title.toLowerCase().includes(query) ||
            item.body.toLowerCase().includes(query),
        )
      : items;
    return sortQuickReplies(matched, sortMode, recentIds);
  }, [items, search, sortMode, recentIds]);

  const selectedItem =
    selectedId && editor?.type !== "create"
      ? (items.find((item) => item.id === selectedId) ?? null)
      : null;

  const createMutation = useMutation({
    mutationFn: () =>
      createCannedResponse(
        {
          title: draftTitle.trim(),
          body: draftBody.trim(),
        },
        cannedApiBase,
      ),
    onSuccess: (created) => {
      toast.success("Quick reply saved");
      invalidate();
      setEditor(null);
      setDraftTitle("");
      setDraftBody("");
      setSelectedId(created.id);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const updateMutation = useMutation({
    mutationFn: () => {
      if (editor?.type !== "edit") {
        throw new Error("Nothing to update");
      }
      return updateCannedResponse(
        editor.id,
        {
          title: draftTitle.trim(),
          body: draftBody.trim(),
        },
        cannedApiBase,
      );
    },
    onSuccess: (updated) => {
      toast.success("Quick reply updated");
      invalidate();
      setEditor(null);
      setDraftTitle("");
      setDraftBody("");
      setSelectedId(updated.id);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCannedResponse(id, cannedApiBase),
    onSuccess: (_data, id) => {
      toast.success("Quick reply deleted");
      setDeleteId(null);
      if (selectedId === id) setSelectedId(null);
      if (editor?.type === "edit" && editor.id === id) setEditor(null);
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const canSaveDraft =
    draftTitle.trim().length > 0 &&
    draftBody.trim().length > 0 &&
    draftTitle.trim().length <= TITLE_MAX_LENGTH &&
    draftBody.trim().length <= BODY_MAX_LENGTH;

  const isSaving = createMutation.isPending || updateMutation.isPending;

  function startCreate() {
    setEditor({ type: "create" });
    setSelectedId(NEW_REPLY_ID);
    setDraftTitle("");
    setDraftBody("");
  }

  function startEdit(item: CannedResponse) {
    setEditor({ type: "edit", id: item.id });
    setSelectedId(item.id);
    setDraftTitle(item.title);
    setDraftBody(item.body);
  }

  function cancelEditor() {
    setEditor(null);
    setDraftTitle("");
    setDraftBody("");
    if (items[0]) setSelectedId(items[0].id);
    else setSelectedId(null);
  }

  function handleUseResponse(item: CannedResponse) {
    markQuickReplyUsed(item.id);
    setRecentIds(getRecentQuickReplyIds());
    onUseResponse(item.body);
    onOpenChange(false);
  }

  function handleSelectListItem(id: string) {
    if (id === NEW_REPLY_ID) {
      startCreate();
      return;
    }
    setEditor(null);
    setSelectedId(id);
    setDraftTitle("");
    setDraftBody("");
  }

  const showForm = editor?.type === "create" || editor?.type === "edit";

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent size="2xl" className="gap-0 p-0 sm:max-w-3xl">
          <DialogHeader className="flex-row items-center justify-between gap-3 space-y-0 pr-14">
            <DialogTitle>Quick replies</DialogTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 gap-1.5"
              onClick={startCreate}
            >
              <Plus className="size-3.5" />
              Add reply
            </Button>
          </DialogHeader>

          <DialogBody className="flex min-h-0 flex-1 flex-col gap-0 overflow-hidden p-0">
            <div className="border-b border-border/60 px-5 py-3">
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search quick replies"
                  className="h-10 bg-muted/40 pl-9"
                />
              </div>
            </div>

            <div className="grid min-h-[min(420px,55vh)] flex-1 md:grid-cols-[220px_minmax(0,1fr)]">
              <aside className="flex min-h-0 flex-col border-b border-border/60 md:border-r md:border-b-0">
                <div className="border-b border-border/50 px-3 py-2">
                  <Select
                    value={sortMode}
                    onValueChange={(value) =>
                      setSortMode((value as QuickReplySortMode) ?? "recent")
                    }
                  >
                    <SelectTrigger size="sm" className="h-8 border-0 bg-transparent px-2 shadow-none">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="recent">Recently used</SelectItem>
                      <SelectItem value="alpha">A–Z</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto p-2">
                  {isLoading ? (
                    <p className="px-2 py-6 text-center text-sm text-muted-foreground">
                      Loading…
                    </p>
                  ) : (
                    <ul className="space-y-0.5">
                      {filteredItems.map((item) => {
                        const isActive =
                          selectedId === item.id && editor?.type !== "create";
                        return (
                          <li key={item.id}>
                            <button
                              type="button"
                              className={cn(
                                "w-full rounded-md px-2.5 py-2 text-left text-sm transition-colors",
                                isActive
                                  ? "bg-primary/10 font-medium text-foreground"
                                  : "text-foreground hover:bg-muted/70",
                              )}
                              onClick={() => handleSelectListItem(item.id)}
                            >
                              <span className="line-clamp-1">{item.title}</span>
                            </button>
                          </li>
                        );
                      })}

                      {!isLoading && filteredItems.length === 0 && !showForm ? (
                        <li className="px-2 py-6 text-center text-sm text-muted-foreground">
                          {items.length === 0
                            ? "No quick replies yet"
                            : "No matches"}
                        </li>
                      ) : null}

                      <li>
                        <button
                          type="button"
                          className={cn(
                            "mt-1 w-full rounded-md px-2.5 py-2 text-left text-sm transition-colors",
                            editor?.type === "create"
                              ? "bg-primary/10 font-medium text-foreground"
                              : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
                          )}
                          onClick={startCreate}
                        >
                          New reply
                        </button>
                      </li>
                    </ul>
                  )}
                </div>
              </aside>

              <div className="flex min-h-0 flex-col">
                {showForm ? (
                  <div className="flex min-h-0 flex-1 flex-col">
                    <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="quick-reply-title">Display name</Label>
                        <Input
                          id="quick-reply-title"
                          value={draftTitle}
                          maxLength={TITLE_MAX_LENGTH}
                          placeholder="Enter display name"
                          onChange={(e) => setDraftTitle(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="quick-reply-body">Message text</Label>
                        <Textarea
                          id="quick-reply-body"
                          value={draftBody}
                          maxLength={BODY_MAX_LENGTH}
                          placeholder="Enter message text"
                          rows={8}
                          className="min-h-[160px] resize-y"
                          onChange={(e) => setDraftBody(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                          {draftBody.length} / {BODY_MAX_LENGTH} characters
                        </p>
                      </div>
                    </div>
                    <DialogFooter sticky={false} className="justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={cancelEditor}
                        disabled={isSaving}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        disabled={!canSaveDraft || isSaving}
                        onClick={() => {
                          if (editor?.type === "create") {
                            createMutation.mutate();
                          } else {
                            updateMutation.mutate();
                          }
                        }}
                      >
                        {isSaving ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : null}
                        {editor?.type === "edit" ? "Save" : "Add"}
                      </Button>
                    </DialogFooter>
                  </div>
                ) : selectedItem ? (
                  <div className="flex min-h-0 flex-1 flex-col">
                    <div className="flex items-start justify-between gap-3 border-b border-border/50 px-5 py-4">
                      <h3 className="min-w-0 text-base font-semibold leading-snug">
                        {selectedItem.title}
                      </h3>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="size-8 shrink-0"
                              aria-label="Quick reply options"
                            >
                              <MoreHorizontal className="size-4" />
                            </Button>
                          }
                        />
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => startEdit(selectedItem)}>
                            <Pencil className="size-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => setDeleteId(selectedItem.id)}
                          >
                            <Trash2 className="size-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                        {selectedItem.body}
                      </p>
                    </div>
                    <div className="border-t border-border/60 px-5 py-3">
                      <Button
                        type="button"
                        className="w-full"
                        onClick={() => handleUseResponse(selectedItem)}
                      >
                        Use response
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-10 text-center">
                    <p className="text-sm text-muted-foreground">
                      {items.length === 0
                        ? "Save common replies so your team can insert them in one click."
                        : "Select a quick reply to preview it."}
                    </p>
                    {items.length === 0 ? (
                      <Button type="button" onClick={startCreate}>
                        <Plus className="size-4" />
                        Add reply
                      </Button>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          </DialogBody>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={deleteId !== null}
        onOpenChange={(next) => !next && setDeleteId(null)}
        title="Delete quick reply?"
        description="This snippet will be removed for all staff."
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        isPending={deleteMutation.isPending}
      />
    </>
  );
}

/** @deprecated Prefer QuickRepliesDialog — kept for existing imports. */
export function CannedResponsesSettingsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <QuickRepliesDialog
      open={open}
      onOpenChange={onOpenChange}
      onUseResponse={() => onOpenChange(false)}
    />
  );
}
