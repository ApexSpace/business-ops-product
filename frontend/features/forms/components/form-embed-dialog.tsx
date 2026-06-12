"use client";

import { useQuery } from "@tanstack/react-query";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { ApiErrorState } from "@/components/data-display/api-error-state";
import { LoadingState } from "@/components/data-display/loading-state";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getFormEmbed } from "@/features/forms/api/forms.api";
import type { FormStatus } from "@/features/forms/types";
import { queryKeys } from "@/lib/query/keys";

interface FormEmbedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formId: string | null;
  status: FormStatus;
}

async function copyText(text: string | null | undefined, label: string) {
  if (!text) {
    toast.error(`${label} is not available`);
    return;
  }
  await navigator.clipboard.writeText(text);
  toast.success(`${label} copied`);
}

export function FormEmbedDialog({
  open,
  onOpenChange,
  formId,
  status,
}: FormEmbedDialogProps) {
  const { data: embed, isLoading, isError, error, refetch } = useQuery({
    queryKey: queryKeys.forms.embed(formId ?? ""),
    queryFn: () => getFormEmbed(formId!),
    enabled: open && Boolean(formId),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="2xl" className="max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Embed form</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4">
          {!formId ? (
            <p className="text-sm text-muted-foreground">
              Save the form before copying embed code.
            </p>
          ) : isLoading ? (
            <LoadingState label="Loading embed settings…" />
          ) : isError ? (
            <ApiErrorState
              title="Could not load embed settings"
              error={error}
              onRetry={() => void refetch()}
            />
          ) : embed ? (
            <>
              {status !== "published" || !embed.isPublished ? (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-200">
                  Publish this form before the embed will work for visitors.
                </div>
              ) : null}

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">Embed Code</p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => void copyText(embed.embedCode, "Embed Code")}
                  >
                    <Copy className="mr-1 size-4" />
                    Copy
                  </Button>
                </div>
                <pre className="min-h-48 overflow-x-hidden whitespace-pre-wrap break-all rounded-md bg-muted p-3 text-xs">
                  {embed.embedCode}
                </pre>
              </div>
            </>
          ) : null}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
