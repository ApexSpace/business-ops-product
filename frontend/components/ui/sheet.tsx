"use client"

import * as React from "react"
import { Dialog as SheetPrimitive } from "@base-ui/react/dialog"
import { XIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { IconButton } from "@/components/ui/icon-button"
import { DrawerCloseIcon } from "@/components/drawer/drawer-icons"
import {
  SHEET_HEADER_CLASS,
  SHEET_HEADER_ROW_CLASS,
} from "@/lib/design/drawer-tokens"

const SheetChromeContext = React.createContext<{ showCloseButton: boolean }>({
  showCloseButton: false,
})

function Sheet({ ...props }: SheetPrimitive.Root.Props) {
  return <SheetPrimitive.Root data-slot="sheet" {...props} />
}

function SheetTrigger({ ...props }: SheetPrimitive.Trigger.Props) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />
}

function SheetClose({ ...props }: SheetPrimitive.Close.Props) {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />
}

function SheetPortal({ ...props }: SheetPrimitive.Portal.Props) {
  return <SheetPrimitive.Portal data-slot="sheet-portal" {...props} />
}

function SheetOverlay({ className, ...props }: SheetPrimitive.Backdrop.Props) {
  return (
    <SheetPrimitive.Backdrop
      data-slot="sheet-overlay"
      className={cn(
        "fixed inset-0 z-50 bg-black/40 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0 supports-backdrop-filter:backdrop-blur-[2px] dark:bg-black/60",
        className
      )}
      {...props}
    />
  )
}

function SheetContent({
  className,
  children,
  side = "right",
  showCloseButton = true,
  ...props
}: SheetPrimitive.Popup.Props & {
  side?: "top" | "right" | "bottom" | "left"
  showCloseButton?: boolean
}) {
  return (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Popup
        data-slot="sheet-content"
        data-side={side}
        className={cn(
          "glass-panel-strong fixed z-50 flex flex-col gap-0 text-sm text-popover-foreground transition duration-200 ease-out data-ending-style:opacity-0 data-starting-style:opacity-0 data-[side=bottom]:inset-x-0 data-[side=bottom]:bottom-0 data-[side=bottom]:h-auto data-[side=bottom]:max-h-[90dvh] data-[side=bottom]:rounded-t-xl data-[side=bottom]:border-t data-[side=bottom]:data-ending-style:translate-y-8 data-[side=bottom]:data-starting-style:translate-y-8 data-[side=left]:inset-y-0 data-[side=left]:left-0 data-[side=left]:h-full data-[side=left]:w-full data-[side=left]:max-w-[var(--sheet-width)] data-[side=left]:border-r data-[side=left]:data-ending-style:translate-x-[-1.5rem] data-[side=left]:data-starting-style:translate-x-[-1.5rem] data-[side=right]:inset-y-0 data-[side=right]:right-0 data-[side=right]:h-full data-[side=right]:w-full data-[side=right]:max-w-[var(--sheet-width)] data-[side=right]:border-l data-[side=right]:data-ending-style:translate-x-8 data-[side=right]:data-starting-style:translate-x-8 data-[side=top]:inset-x-0 data-[side=top]:top-0 data-[side=top]:h-auto data-[side=top]:max-h-[90dvh] data-[side=top]:rounded-b-xl data-[side=top]:border-b data-[side=top]:data-ending-style:translate-y-[-1.5rem] data-[side=top]:data-starting-style:translate-y-[-1.5rem]",
          "has-[[data-slot=sheet-header]]:[&_[data-slot=sheet-close-fallback]]:hidden",
          className
        )}
        {...props}
      >
        <SheetChromeContext.Provider value={{ showCloseButton }}>
          {children}
          {showCloseButton ? (
            <SheetPrimitive.Close
              data-slot="sheet-close-fallback"
              render={
                <IconButton
                  variant="ghost"
                  className="absolute top-[var(--drawer-header-padding-y)] right-4 z-10"
                  size="header"
                  aria-label="Close"
                />
              }
            >
              <XIcon />
              <span className="sr-only">Close</span>
            </SheetPrimitive.Close>
          ) : null}
        </SheetChromeContext.Provider>
      </SheetPrimitive.Popup>
    </SheetPortal>
  )
}

function SheetTitle({ className, ...props }: SheetPrimitive.Title.Props) {
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      className={cn("text-sm font-semibold leading-tight text-foreground", className)}
      {...props}
    />
  )
}

function SheetDescription({
  className,
  ...props
}: SheetPrimitive.Description.Props) {
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      className={cn("text-[11px] text-foreground-subtle", className)}
      {...props}
    />
  )
}

function SheetHeaderClose() {
  return (
    <SheetPrimitive.Close
      data-slot="sheet-close"
      render={
        <IconButton
          type="button"
          variant="ghost"
          aria-label="Close"
          size="header"
        />
      }
    >
      <DrawerCloseIcon />
      <span className="sr-only">Close</span>
    </SheetPrimitive.Close>
  )
}

function SheetHeader({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  const { showCloseButton } = React.useContext(SheetChromeContext)
  const items = React.Children.toArray(children)
  const hasCustomRow = items.some(
    (child) =>
      React.isValidElement(child) &&
      (child.props as { "data-slot"?: string })["data-slot"] ===
        "sheet-header-row",
  )

  if (hasCustomRow) {
    return (
      <div
        data-slot="sheet-header"
        className={cn(SHEET_HEADER_CLASS, className)}
        {...props}
      >
        {children}
      </div>
    )
  }

  const heading: React.ReactNode[] = []
  const descriptions: React.ReactNode[] = []

  for (const child of items) {
    if (React.isValidElement(child) && child.type === SheetDescription) {
      descriptions.push(child)
    } else {
      heading.push(child)
    }
  }

  return (
    <div
      data-slot="sheet-header"
      className={cn(SHEET_HEADER_CLASS, className)}
      {...props}
    >
      <div data-slot="sheet-header-row" className={SHEET_HEADER_ROW_CLASS}>
        <div className="flex min-h-[var(--control-height-sm)] min-w-0 flex-1 items-center">
          <div className="min-w-0 flex-1">{heading}</div>
        </div>
        {showCloseButton ? <SheetHeaderClose /> : null}
      </div>
      {descriptions}
    </div>
  )
}

function SheetBody({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-body"
      className={cn("min-h-0 flex-1 overflow-y-auto px-4 pt-drawer-body-y pb-drawer-body-bottom", className)}
      {...props}
    />
  )
}

function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn(
        "mt-auto flex shrink-0 flex-col items-stretch gap-drawer-footer border-t border-border bg-white/8 px-4 py-drawer-footer-y sm:flex-row sm:items-center sm:justify-end dark:bg-white/5",
        className
      )}
      {...props}
    />
  )
}

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetBody,
  SheetFooter,
  SheetTitle,
  SheetDescription,
}
