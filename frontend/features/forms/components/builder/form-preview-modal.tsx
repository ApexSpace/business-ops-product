"use client";

import { Monitor, Smartphone, Tablet } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { FormDefinition, PreviewDevice } from "@/features/forms/types";
import { FormRuntimeView } from "@/features/forms/components/form-runtime-view";
import {
  getPreviewDeviceWidth,
} from "@/features/forms/utils/field-style.util";

interface FormPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  definition: FormDefinition;
  previewDevice: PreviewDevice;
  onPreviewDeviceChange: (device: PreviewDevice) => void;
}

export function FormPreviewModal({
  open,
  onOpenChange,
  definition,
  previewDevice,
  onPreviewDeviceChange,
}: FormPreviewModalProps) {
  const [submitted, setSubmitted] = useState(false);

  const handleOpenChange = (next: boolean) => {
    if (!next) setSubmitted(false);
    onOpenChange(next);
  };

  const handleSubmit = (_data: Record<string, unknown>) => {
    setSubmitted(true);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent size="2xl" className="max-h-[90vh]">
        <DialogHeader className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-4">
          <DialogTitle className="truncate">Form preview</DialogTitle>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="icon"
              variant={previewDevice === "desktop" ? "default" : "outline"}
              aria-label="Desktop preview"
              onClick={() => onPreviewDeviceChange("desktop")}
            >
              <Monitor className="size-4" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant={previewDevice === "tablet" ? "default" : "outline"}
              aria-label="Tablet preview"
              onClick={() => onPreviewDeviceChange("tablet")}
            >
              <Tablet className="size-4" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant={previewDevice === "mobile" ? "default" : "outline"}
              aria-label="Mobile preview"
              onClick={() => onPreviewDeviceChange("mobile")}
            >
              <Smartphone className="size-4" />
            </Button>
          </div>

          {/* Balances the absolute close button so device icons stay centered */}
          <span aria-hidden="true" className="size-8 shrink-0" />
        </DialogHeader>

        <DialogBody className="overflow-y-auto">
          <div className="flex justify-center py-4">
            <div
              className={cn(
                "w-full border shadow-sm transition-all",
                getPreviewDeviceWidth(previewDevice),
              )}
            >
              <FormRuntimeView
                definition={definition}
                submitted={submitted}
                onSubmit={handleSubmit}
                onResetSubmitted={() => setSubmitted(false)}
              />
            </div>
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
