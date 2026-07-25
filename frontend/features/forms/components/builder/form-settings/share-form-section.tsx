"use client";

import { Copy, ExternalLink, Share2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SectionHeader } from "@/features/forms/components/builder/settings-controls/section-header";
import { getFormEmbed } from "@/features/forms/api/forms.api";
import { useFormsHost } from "@/features/forms/forms-host-context";
import type { FormStatus } from "@/features/forms/types";
import { copyTextToClipboard } from "@/features/forms/utils/copy-text.util";
import { queryKeys } from "@/lib/query/keys";

interface ShareFormSectionProps {
  formId: string | null;
  status: FormStatus;
  onOpenShareDialog: () => void;
}

export function ShareFormSection({
  formId,
  status,
  onOpenShareDialog,
}: ShareFormSectionProps) {
  const { apiBase } = useFormsHost();
  const isPublished = status === "published";
  const { data: embed } = useQuery({
    queryKey: queryKeys.forms.embed(apiBase, formId ?? ""),
    queryFn: () => getFormEmbed(formId!, apiBase),
    enabled: Boolean(formId) && isPublished,
  });

  return (
    <SectionHeader title="Share & Embed">
      {!formId ? (
        <p className="text-sm text-muted-foreground">
          Save the form to get a shareable link.
        </p>
      ) : !isPublished ? (
        <p className="text-sm text-muted-foreground">
          Publish this form to get a public link and embed code for your website.
        </p>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Share the link below or embed the form on any site. Responses appear in
            View submissions.
          </p>

          <div className="flex gap-2">
            <Input
              readOnly
              value={embed?.hostedPageUrl ?? "Loading link…"}
              className="font-mono text-xs"
            />
            <Button
              type="button"
              size="icon"
              variant="outline"
              aria-label="Copy form link"
              disabled={!embed?.hostedPageUrl}
              onClick={() =>
                void copyTextToClipboard(embed?.hostedPageUrl, "Form link")
              }
            >
              <Copy className="size-4" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="outline"
              aria-label="Open form in new tab"
              disabled={!embed?.hostedPageUrl}
              nativeButton={false}
              render={
                embed?.hostedPageUrl ? (
                  <a
                    href={embed.hostedPageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  />
                ) : (
                  <span />
                )
              }
            >
              <ExternalLink className="size-4" />
            </Button>
          </div>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="w-full"
            onClick={onOpenShareDialog}
          >
            <Share2 className="mr-2 size-4" />
            Share & embed options
          </Button>
        </div>
      )}
    </SectionHeader>
  );
}
