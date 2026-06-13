"use client";

import type { WhatsAppTemplatePreviewModel } from "@/features/whatsapp-settings/utils/whatsapp-template-preview.util";
import { cn } from "@/lib/utils";

export interface WhatsAppTemplatePreviewProps {
  preview: WhatsAppTemplatePreviewModel;
  className?: string;
}

export function WhatsAppTemplatePreview({
  preview,
  className,
}: WhatsAppTemplatePreviewProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border/70 bg-[#efeae2] p-4 dark:bg-muted/40",
        className,
      )}
    >
      <div className="mx-auto max-w-sm">
        <div className="rounded-lg bg-white shadow-sm ring-1 ring-black/5 dark:bg-card">
          {preview.headerMediaLabel ? (
            <div className="flex h-32 items-center justify-center rounded-t-lg bg-muted/60 text-sm text-muted-foreground">
              {preview.headerMediaLabel}
            </div>
          ) : null}
          <div className="space-y-2 p-4">
            {preview.header ? (
              <p className="text-sm font-semibold text-foreground">
                {preview.header}
              </p>
            ) : null}
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
              {preview.body}
            </p>
            {preview.footer ? (
              <p className="text-xs text-muted-foreground">{preview.footer}</p>
            ) : null}
          </div>
          {preview.buttons.length > 0 ? (
            <div className="border-t border-border/70">
              {preview.buttons.map((label) => (
                <div
                  key={label}
                  className="border-b border-border/70 px-4 py-2.5 text-center text-sm font-medium text-sky-700 last:border-b-0 dark:text-sky-400"
                >
                  {label}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
