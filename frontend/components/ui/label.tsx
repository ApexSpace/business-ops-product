"use client";

import * as React from "react";
import { RequiredIndicator } from "@/components/ui/required-indicator";
import { cn } from "@/lib/utils";

function Label({
  className,
  required,
  children,
  ...props
}: React.ComponentProps<"label"> & {
  required?: boolean;
}) {
  return (
    <label
      data-slot="label"
      className={cn(
        "flex items-center gap-1 text-xs font-medium leading-none text-foreground select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        className,
      )}
      {...props}
    >
      {children}
      {required ? <RequiredIndicator /> : null}
    </label>
  );
}

export { Label };
