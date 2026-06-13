"use client";

import { useMemo } from "react";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { WhatsAppTemplateDetail } from "@/features/whatsapp-settings/api/whatsapp-templates.api";
import { WhatsAppTemplatePreview } from "@/features/whatsapp-settings/components/whatsapp-template-preview";
import { WhatsAppTemplateStatusBadge } from "@/features/whatsapp-settings/components/whatsapp-template-status-badge";
import {
  formatTemplateCategory,
  formatTemplateTableDate,
} from "@/features/whatsapp-settings/utils/whatsapp-template-display.util";
import { componentsToFormValues } from "@/features/whatsapp-settings/utils/whatsapp-template-components.util";
import { renderTemplatePreview } from "@/features/whatsapp-settings/utils/whatsapp-template-preview.util";

export interface WhatsAppTemplateDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: WhatsAppTemplateDetail | null;
}

export function WhatsAppTemplateDetailSheet({
  open,
  onOpenChange,
  template,
}: WhatsAppTemplateDetailSheetProps) {
  const preview = useMemo(() => {
    if (!template) return null;
    return renderTemplatePreview(
      componentsToFormValues(template.components, {
        name: template.name,
        language: template.language,
        category: template.category,
      }),
    );
  }, [template]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>{template?.name ?? "Template details"}</SheetTitle>
          <SheetDescription>
            Review Meta approval status and message content.
          </SheetDescription>
        </SheetHeader>
        <SheetBody className="space-y-5">
          {template ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <WhatsAppTemplateStatusBadge status={template.status} />
                <span className="text-sm text-muted-foreground">
                  {formatTemplateCategory(template.category)} · {template.language}
                </span>
              </div>

              {template.rejectionReason ? (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-900 dark:text-red-200">
                  <p className="font-medium">Rejection reason</p>
                  <p className="mt-1">{template.rejectionReason}</p>
                </div>
              ) : null}

              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-muted-foreground">Last updated</dt>
                  <dd>{formatTemplateTableDate(template.updatedAt)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Last synced</dt>
                  <dd>{formatTemplateTableDate(template.lastSyncedAt)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Submitted</dt>
                  <dd>{formatTemplateTableDate(template.submittedAt)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Meta template ID</dt>
                  <dd className="truncate">{template.metaTemplateId ?? "—"}</dd>
                </div>
              </dl>

              {preview ? <WhatsAppTemplatePreview preview={preview} /> : null}

              {!template.canEdit && template.editBlockedReason ? (
                <p className="text-sm text-muted-foreground">
                  {template.editBlockedReason}
                </p>
              ) : null}
            </>
          ) : null}
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
