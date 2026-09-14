"use client";

import { MousePointerClick } from "lucide-react";

export function BuilderEmptyState() {
  return (
    <div className="flex min-h-[280px] flex-col items-center justify-center rounded-lg border border-dashed bg-muted/30 px-6 py-12 text-center">
      <MousePointerClick className="mb-3 size-8 text-muted-foreground" />
      <p className="text-sm font-medium">Your form is empty</p>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        Add fields from the palette on the left to start building your lead
        capture form.
      </p>
    </div>
  );
}
