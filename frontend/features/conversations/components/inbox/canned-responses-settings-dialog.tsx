"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDeleteDialog } from "@/components/forms/confirm-delete-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  createCannedResponse,
  deleteCannedResponse,
  listCannedResponses,
  type CannedResponse,
} from "@/features/conversations/api/canned-responses.api";
import { queryKeys } from "@/lib/query/keys";

interface CannedResponsesSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CannedResponsesSettingsDialog({
  open,
  onOpenChange,
}: CannedResponsesSettingsDialogProps) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: items = [], isLoading } = useQuery({
    queryKey: queryKeys.cannedResponses.list(),
    queryFn: listCannedResponses,
    enabled: open,
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({
      queryKey: queryKeys.cannedResponses.all(),
    });
  };

  const createMutation = useMutation({
    mutationFn: () => createCannedResponse({ title: title.trim(), body: body.trim() }),
    onSuccess: () => {
      toast.success("Quick reply saved");
      setTitle("");
      setBody("");
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCannedResponse(id),
    onSuccess: () => {
      toast.success("Quick reply deleted");
      setDeleteId(null);
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const canCreate = title.trim().length > 0 && body.trim().length > 0;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Quick replies</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Saved snippets staff can insert in web chat replies.
          </p>

          <div className="space-y-2 rounded-lg border p-3">
            <Input
              placeholder="Title (e.g. Thanks for reaching out)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <Textarea
              placeholder="Message body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={3}
            />
            <Button
              type="button"
              size="sm"
              disabled={!canCreate || createMutation.isPending}
              onClick={() => createMutation.mutate()}
            >
              {createMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Plus className="size-4" />
              )}
              Add quick reply
            </Button>
          </div>

          <div className="max-h-64 space-y-2 overflow-y-auto">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : items.length === 0 ? (
              <p className="text-sm text-muted-foreground">No quick replies yet.</p>
            ) : (
              items.map((item: CannedResponse) => (
                <div
                  key={item.id}
                  className="flex items-start gap-2 rounded-md border p-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{item.title}</p>
                    <p className="line-clamp-2 text-xs text-muted-foreground">
                      {item.body}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => setDeleteId(item.id)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
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
