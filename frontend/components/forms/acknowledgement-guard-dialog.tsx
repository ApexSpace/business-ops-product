"use client";

import { useEffect, useState } from "react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ActionButton } from "@/components/ui/action-button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

export interface AcknowledgementGuardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: React.ReactNode;
  acknowledgementLabel: string;
  cancelLabel?: string;
  confirmLabel?: string;
  /** When false, confirm is enabled without toggling the switch. */
  requireAcknowledgement?: boolean;
  onConfirm: () => void;
  className?: string;
}

export function AcknowledgementGuardDialog({
  open,
  onOpenChange,
  title,
  description,
  acknowledgementLabel,
  cancelLabel = "Cancel",
  confirmLabel = "OK",
  requireAcknowledgement = true,
  onConfirm,
  className,
}: AcknowledgementGuardDialogProps) {
  const [acknowledged, setAcknowledged] = useState(false);

  useEffect(() => {
    if (!open) {
      setAcknowledged(false);
    }
  }, [open]);

  const canConfirm = !requireAcknowledgement || acknowledged;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent
        className={cn(
          "z-[70] max-w-md gap-5 p-6 sm:max-w-md",
          className,
        )}
      >
        <AlertDialogHeader className="place-items-center text-center sm:place-items-center sm:text-center">
          <AlertDialogTitle className="text-[17px] font-semibold">
            {title}
          </AlertDialogTitle>
          <div className="space-y-3 text-[13.5px] leading-relaxed text-muted-foreground">
            {description}
          </div>
        </AlertDialogHeader>

        {requireAcknowledgement ? (
          <div className="flex items-start gap-3 rounded-[var(--radius-md)] border border-border/60 bg-muted/20 px-3.5 py-3">
            <Switch
              id="acknowledgement-guard"
              checked={acknowledged}
              onCheckedChange={(checked) => setAcknowledged(checked === true)}
              className="mt-0.5 shrink-0"
            />
            <Label
              htmlFor="acknowledgement-guard"
              className="cursor-pointer text-[13px] font-normal leading-snug text-foreground"
            >
              {acknowledgementLabel}
            </Label>
          </div>
        ) : null}

        <AlertDialogFooter className="grid grid-cols-2 gap-3 border-0 bg-transparent p-0 sm:grid-cols-2 sm:justify-stretch">
          <AlertDialogCancel className="h-11 w-full rounded-[var(--radius-md)] text-[13px] font-semibold uppercase tracking-[0.04em]">
            {cancelLabel}
          </AlertDialogCancel>
          <ActionButton
            type="button"
            className="w-full"
            disabled={!canConfirm}
            onClick={() => {
              if (!canConfirm) return;
              onConfirm();
              onOpenChange(false);
            }}
          >
            {confirmLabel}
          </ActionButton>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
