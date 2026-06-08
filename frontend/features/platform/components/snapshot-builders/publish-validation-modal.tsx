"use client";

import { AlertCircle, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  hasBlockingValidationErrors,
  type SnapshotValidationItem,
} from "@/features/platform/utils/snapshot-validation";

const ICONS = {
  error: AlertCircle,
  warning: AlertTriangle,
  success: CheckCircle2,
};

const COLORS = {
  error: "text-destructive",
  warning: "text-amber-600",
  success: "text-emerald-600",
};

interface PublishValidationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: SnapshotValidationItem[];
  isPublishing: boolean;
  onConfirmPublish: () => void;
}

export function PublishValidationModal({
  open,
  onOpenChange,
  items,
  isPublishing,
  onConfirmPublish,
}: PublishValidationModalProps) {
  const hasErrors = hasBlockingValidationErrors(items);
  const errorCount = items.filter((i) => i.severity === "error").length;
  const warningCount = items.filter((i) => i.severity === "warning").length;
  const successCount = items.filter((i) => i.severity === "success").length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Publish snapshot</DialogTitle>
          <DialogDescription>
            Review validation checks before publishing. Critical errors must be
            fixed; warnings are recommendations only.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap gap-3 text-sm">
          <span className="text-destructive">{errorCount} errors</span>
          <span className="text-amber-600">{warningCount} warnings</span>
          <span className="text-emerald-600">{successCount} passed</span>
        </div>

        <ul className="max-h-64 space-y-2 overflow-y-auto">
          {items.map((item) => {
            const Icon = ICONS[item.severity];
            return (
              <li
                key={item.id}
                className={cn(
                  "flex items-start gap-2 rounded-md border p-3 text-sm",
                  item.severity === "error" &&
                    "border-destructive/30 bg-destructive/5",
                  item.severity === "warning" &&
                    "border-amber-500/30 bg-amber-500/5",
                  item.severity === "success" &&
                    "border-emerald-500/30 bg-emerald-500/5",
                )}
              >
                <Icon
                  className={cn("mt-0.5 size-4 shrink-0", COLORS[item.severity])}
                />
                <div>
                  <p>{item.message}</p>
                  {item.section ? (
                    <p className="text-xs text-muted-foreground capitalize">
                      Section: {item.section}
                    </p>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>

        {hasErrors ? (
          <p className="text-sm text-destructive">
            Fix all critical errors before publishing.
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            No blocking errors. You can publish when ready.
          </p>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPublishing}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={hasErrors || isPublishing}
            onClick={onConfirmPublish}
          >
            {isPublishing ? "Publishing…" : "Publish snapshot"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
