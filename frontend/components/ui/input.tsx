import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

function Input({ className, type, ref, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      ref={ref}
      type={type}
      data-slot="input"
      className={cn(
        "glass-control h-[var(--control-height)] w-full min-w-0 rounded-[var(--radius-control)] border border-input px-3 text-sm transition-[border-color,box-shadow,background-color] duration-150 outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-primary-tint disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-muted/40 disabled:opacity-60 aria-invalid:border-destructive aria-invalid:ring-[3px] aria-invalid:ring-destructive/25 dark:disabled:bg-input/10 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/30",
        className
      )}
      {...props}
    />
  )
}

export { Input }
