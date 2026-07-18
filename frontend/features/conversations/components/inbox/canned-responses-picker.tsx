"use client";

import { useState } from "react";
import { Tags } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QuickRepliesDialog } from "@/features/conversations/components/inbox/quick-replies-dialog";
import { cn } from "@/lib/utils";

interface CannedResponsesPickerProps {
  onSelect: (body: string) => void;
  disabled?: boolean;
  className?: string;
}

export function CannedResponsesPicker({
  onSelect,
  disabled = false,
  className,
}: CannedResponsesPickerProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className={cn(
          "size-8 shrink-0 rounded-md text-muted-foreground",
          className,
        )}
        disabled={disabled}
        onClick={() => setOpen(true)}
        aria-label="Quick replies"
      >
        <Tags className="size-4" />
      </Button>

      <QuickRepliesDialog
        open={open}
        onOpenChange={setOpen}
        onUseResponse={onSelect}
      />
    </>
  );
}
