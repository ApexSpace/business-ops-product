"use client";

import { XIcon } from "lucide-react";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { IconButton } from "@/components/ui/icon-button";
import {
  DRAWER_FOOTER_ACTIONS_CLASS,
  DRAWER_FOOTER_BUTTON_CLASS,
  DRAWER_SHEET_FOOTER_WIDE_CLASS,
} from "@/components/forms/drawer-sheet";
import {
  DRAWER_SHELL_BODY_CLASS,
  DRAWER_SHELL_CONTENT_INSET_CLASS,
  DRAWER_SHELL_FOOTER_CLASS,
  DRAWER_SHELL_HEADER_CLASS,
  DRAWER_SHELL_HEADER_ROW_CLASS,
  DRAWER_SHELL_HEADER_ACTION_CLASS,
  DRAWER_SHELL_TITLE_CLASS,
  DRAWER_SHELL_DESCRIPTION_CLASS,
  drawerShellWidthClass,
  type DrawerShellWidthTier,
} from "@/lib/design/drawer-shell-tokens";
import { cn } from "@/lib/utils";

export interface DrawerShellProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Embedded panel (calendar side column) vs overlay sheet */
  variant?: "panel" | "sheet";
  width?: DrawerShellWidthTier;
  title?: React.ReactNode;
  description?: React.ReactNode;
  headerActions?: React.ReactNode;
  footer?: React.ReactNode;
  showCloseButton?: boolean;
  /** Higher z-index for stacked overlays (e.g. conversation over appointment) */
  stackLevel?: "base" | "overlay";
  className?: string;
  headerClassName?: string;
  bodyClassName?: string;
  contentClassName?: string;
  footerClassName?: string;
  children: React.ReactNode;
}

function DrawerShellInner({
  title,
  description,
  headerActions,
  footer,
  headerClassName,
  bodyClassName,
  contentClassName,
  footerClassName,
  inSheet = true,
  showCloseButton = false,
  onRequestClose,
  children,
}: Pick<
  DrawerShellProps,
  | "title"
  | "description"
  | "headerActions"
  | "footer"
  | "headerClassName"
  | "bodyClassName"
  | "contentClassName"
  | "footerClassName"
  | "children"
> & {
  inSheet?: boolean;
  showCloseButton?: boolean;
  onRequestClose?: () => void;
}) {
  // `SheetTitle` / `SheetDescription` are Base UI Dialog primitives that
  // require the Dialog root context. The `panel` variant renders outside a
  // Sheet, so fall back to plain elements there.
  const Title = inSheet ? SheetTitle : "h2";
  const Description = inSheet ? SheetDescription : "p";

  return (
    <>
      {title ? (
        <SheetHeader className={cn(DRAWER_SHELL_HEADER_CLASS, headerClassName)}>
          <div className={DRAWER_SHELL_HEADER_ROW_CLASS}>
            <div className="min-w-0 flex-1">
              <Title className={DRAWER_SHELL_TITLE_CLASS}>{title}</Title>
              {description ? (
                <Description className={DRAWER_SHELL_DESCRIPTION_CLASS}>
                  {description}
                </Description>
              ) : null}
            </div>
            {headerActions || (inSheet && showCloseButton) ? (
              <div className="flex shrink-0 items-center gap-1.5">
                {headerActions}
                {inSheet && showCloseButton && onRequestClose ? (
                  <IconButton
                    type="button"
                    variant="ghost"
                    aria-label="Close"
                    className={DRAWER_SHELL_HEADER_ACTION_CLASS}
                    onClick={onRequestClose}
                  >
                    <XIcon className="size-4" />
                  </IconButton>
                ) : null}
              </div>
            ) : null}
          </div>
        </SheetHeader>
      ) : null}
      <SheetBody className={cn(DRAWER_SHELL_BODY_CLASS, bodyClassName)}>
        <div className={cn(DRAWER_SHELL_CONTENT_INSET_CLASS, contentClassName)}>
          {children}
        </div>
      </SheetBody>
      {footer ? (
        <SheetFooter
          className={cn(DRAWER_SHELL_FOOTER_CLASS, footerClassName)}
        >
          {footer}
        </SheetFooter>
      ) : null}
    </>
  );
}

export function DrawerShell({
  open = true,
  onOpenChange,
  variant = "sheet",
  width = "standard",
  title,
  description,
  headerActions,
  footer,
  showCloseButton = true,
  stackLevel = "base",
  className,
  headerClassName,
  bodyClassName,
  contentClassName,
  footerClassName,
  children,
}: DrawerShellProps) {
  const widthClass = drawerShellWidthClass(width);
  const stackZ =
    stackLevel === "overlay" ? "z-[60] [&+[data-slot=sheet-overlay]]:z-[55]" : "";

  const handleRequestClose = () => onOpenChange?.(false);

  if (variant === "panel") {
    return (
      <aside
        className={cn(
          "flex h-full min-h-0 w-full max-w-[var(--sheet-width)] shrink-0 flex-col border-l border-border bg-background",
          widthClass,
          className,
        )}
      >
        <DrawerShellInner
          title={title}
          description={description}
          headerActions={headerActions}
          footer={footer}
          headerClassName={headerClassName}
          bodyClassName={bodyClassName}
          contentClassName={contentClassName}
          footerClassName={footerClassName}
          inSheet={false}
        >
          {children}
        </DrawerShellInner>
      </aside>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className={cn(
          "gap-0 p-0 shadow-elevation-lg",
          widthClass,
          stackZ,
          className,
        )}
      >
        <DrawerShellInner
          title={title}
          description={description}
          headerActions={headerActions}
          footer={footer}
          headerClassName={headerClassName}
          bodyClassName={bodyClassName}
          contentClassName={contentClassName}
          footerClassName={footerClassName}
          showCloseButton={showCloseButton}
          onRequestClose={handleRequestClose}
        >
          {children}
        </DrawerShellInner>
      </SheetContent>
    </Sheet>
  );
}

export {
  DRAWER_FOOTER_ACTIONS_CLASS,
  DRAWER_FOOTER_BUTTON_CLASS,
  DRAWER_SHEET_FOOTER_WIDE_CLASS,
  DRAWER_SHELL_HEADER_ACTION_CLASS,
};
