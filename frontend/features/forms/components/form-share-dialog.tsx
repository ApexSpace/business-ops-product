"use client";

import { useQuery } from "@tanstack/react-query";
import { Copy, ExternalLink, Link2, Code2 } from "lucide-react";
import { ApiErrorState } from "@/components/data-display/api-error-state";
import { LoadingState } from "@/components/data-display/loading-state";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { getFormEmbed } from "@/features/forms/api/forms.api";
import type { FormStatus } from "@/features/forms/types";
import { copyTextToClipboard } from "@/features/forms/utils/copy-text.util";
import { queryKeys } from "@/lib/query/keys";

interface FormShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formId: string | null;
  status: FormStatus;
  formName?: string;
}

function PublishedNotice({ isPublished }: { isPublished: boolean }) {
  if (isPublished) return null;

  return (
    <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-200">
      Publish this form before sharing. Draft forms are not accessible to visitors.
    </div>
  );
}

function CopyField({
  label,
  value,
  copyLabel,
  disabled,
}: {
  label: string;
  value: string;
  copyLabel: string;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">{label}</p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={disabled || !value}
          onClick={() => void copyTextToClipboard(value, copyLabel)}
        >
          <Copy className="mr-1 size-4" />
          Copy
        </Button>
      </div>
      <Input readOnly value={value} className="font-mono text-xs" />
    </div>
  );
}

export function FormShareDialog({
  open,
  onOpenChange,
  formId,
  status,
  formName,
}: FormShareDialogProps) {
  const { data: embed, isLoading, isError, error, refetch } = useQuery({
    queryKey: queryKeys.forms.embed(formId ?? ""),
    queryFn: () => getFormEmbed(formId!),
    enabled: open && Boolean(formId),
  });

  const isPublished = status === "published" && embed?.isPublished;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="2xl" className="max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Share & embed form</DialogTitle>
          <DialogDescription>
            {formName
              ? `Share "${formName}" via link or embed it on any website. Submissions appear under View submissions.`
              : "Share your form via link or embed it on any website."}
          </DialogDescription>
        </DialogHeader>

        <DialogBody>
          {!formId ? (
            <p className="text-sm text-muted-foreground">
              Save the form first to get a shareable link.
            </p>
          ) : isLoading ? (
            <LoadingState label="Loading share settings…" />
          ) : isError ? (
            <ApiErrorState
              title="Could not load share settings"
              error={error}
              onRetry={() => void refetch()}
            />
          ) : embed ? (
            <div className="space-y-4">
              <PublishedNotice isPublished={!!isPublished} />

              <Tabs defaultValue="link">
                <TabsList className="w-full">
                  <TabsTrigger value="link" className="flex-1 gap-1.5">
                    <Link2 className="size-4" />
                    Share link
                  </TabsTrigger>
                  <TabsTrigger value="embed" className="flex-1 gap-1.5">
                    <Code2 className="size-4" />
                    Embed
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="link" className="mt-4 space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Send this link by email, SMS, or social media. Anyone with the link
                    can submit the form — no login required.
                  </p>

                  <CopyField
                    label="Public form link"
                    value={embed.hostedPageUrl}
                    copyLabel="Form link"
                    disabled={!isPublished}
                  />

                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={!isPublished || !embed.hostedPageUrl}
                      onClick={() => void copyTextToClipboard(embed.hostedPageUrl, "Form link")}
                    >
                      <Copy className="mr-1 size-4" />
                      Copy link
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={!isPublished || !embed.hostedPageUrl}
                      nativeButton={false}
                      render={
                        <a
                          href={embed.hostedPageUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        />
                      }
                    >
                      <ExternalLink className="mr-1 size-4" />
                      Open form
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="embed" className="mt-4 space-y-5">
                  <p className="text-sm text-muted-foreground">
                    Paste this code into your website HTML. The form auto-resizes to fit
                    your page and submissions are saved here.
                  </p>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">Recommended embed code</p>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={!isPublished}
                        onClick={() => void copyTextToClipboard(embed.embedCode, "Embed code")}
                      >
                        <Copy className="mr-1 size-4" />
                        Copy
                      </Button>
                    </div>
                    <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-all rounded-md bg-muted p-3 text-xs">
                      {embed.embedCode}
                    </pre>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">Simple iframe only</p>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={!isPublished}
                        onClick={() =>
                          void copyTextToClipboard(embed.iframeEmbed, "Iframe code")
                        }
                      >
                        <Copy className="mr-1 size-4" />
                        Copy
                      </Button>
                    </div>
                    <pre className="max-h-28 overflow-auto whitespace-pre-wrap break-all rounded-md bg-muted p-3 text-xs">
                      {embed.iframeEmbed}
                    </pre>
                    <p className="text-xs text-muted-foreground">
                      Use the recommended code when you want automatic height resizing.
                    </p>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          ) : null}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
