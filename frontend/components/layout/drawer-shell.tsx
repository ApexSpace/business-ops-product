"use client";

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
import { DrawerCloseIcon } from "@/components/drawer/drawer-icons";
import { DrawerSpine } from "@/components/drawer/drawer-spine";
import {
  DRAWER_FOOTER_ACTIONS_CLASS,
  DRAWER_FOOTER_BUTTON_CLASS,
  DRAWER_SHEET_FOOTER_WIDE_CLASS,
} from "@/components/forms/drawer-sheet";
import {
  DRAWER_COMPACT_CONTENT_CLASS,
  DRAWER_COMPACT_FOOTER_CLASS,
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
import {
  APPOINTMENT_DRAWER_CLOSE_ACTION_CLASS,
  APPOINTMENT_DRAWER_CONTENT_PANEL_CLASS,
  APPOINTMENT_DRAWER_SHEET_CONTENT_CLASS,
} from "@/features/appointments/styles/appointment-drawer-tokens";
import { cn } from "@/lib/utils";

export interface DrawerShellProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Embedded panel (calendar side column) vs overlay sheet */
  variant?: "panel" | "sheet";
  width?: DrawerShellWidthTier;
  title?: React.ReactNode;
  description?: React.ReactNode;
  /** Optional vertical spine label (e.g. “NEW APPOINTMENT”). */
  spineLabel?: string;
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
  useAppointmentFooter = false,
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
  useAppointmentFooter?: boolean;
}) {
  const Title = inSheet ? SheetTitle : "h2";
  const isRichDescription =
    description != null && typeof description !== "string";
  const Description = inSheet ? SheetDescription : isRichDescription ? "div" : "p";

  return (
    <>
      {title ? (
        <SheetHeader className={cn(DRAWER_SHELL_HEADER_CLASS, headerClassName)}>
          <div
            data-slot="sheet-header-row"
            className={DRAWER_SHELL_HEADER_ROW_CLASS}
          >
            <div className="min-w-0 flex-1">
              <Title className={DRAWER_SHELL_TITLE_CLASS}>{title}</Title>
              {description ? (
                <Description
                  className={DRAWER_SHELL_DESCRIPTION_CLASS}
                  {...(inSheet && isRichDescription
                    ? { render: <div /> }
                    : {})}
                >
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
                    className={cn(
                      DRAWER_SHELL_HEADER_ACTION_CLASS,
                      APPOINTMENT_DRAWER_CLOSE_ACTION_CLASS,
                    )}
                    onClick={onRequestClose}
                  >
                    <DrawerCloseIcon />
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
          className={cn(
            !useAppointmentFooter && DRAWER_SHELL_FOOTER_CLASS,
            footerClassName,
          )}
        >
          {footer}
        </SheetFooter>
      ) : null}
    </>
  );
}

function DrawerShellLayout({
  spineLabel,
  className,
  widthClass,
  stackZ,
  resolvedContentClassName,
  resolvedFooterClassName,
  headerClassName,
  bodyClassName,
  footerClassName,
  title,
  description,
  headerActions,
  footer,
  showCloseButton,
  onRequestClose,
  inSheet,
  useAppointmentFooter = false,
  children,
}: {
  spineLabel?: string;
  className?: string;
  widthClass: string;
  stackZ?: string;
  resolvedContentClassName?: string;
  resolvedFooterClassName?: string;
  headerClassName?: string;
  bodyClassName?: string;
  footerClassName?: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  headerActions?: React.ReactNode;
  footer?: React.ReactNode;
  showCloseButton?: boolean;
  onRequestClose?: () => void;
  inSheet: boolean;
  useAppointmentFooter?: boolean;
  children: React.ReactNode;
}) {
  const hasSpine = Boolean(spineLabel);

  return (
    <div
      className={cn(
        "flex h-full min-h-0 w-full",
        hasSpine && cn("overflow-hidden", className),
        hasSpine && widthClass,
        hasSpine && stackZ,
      )}
    >
      {hasSpine && spineLabel ? <DrawerSpine label={spineLabel} /> : null}
      <div
        className={cn(
          "flex min-h-0 min-w-0 flex-1 flex-col",
          hasSpine && cn(APPOINTMENT_DRAWER_CONTENT_PANEL_CLASS, "overflow-hidden"),
          !hasSpine && className,
          !hasSpine && widthClass,
          !hasSpine && stackZ,
        )}
      >
        <DrawerShellInner
          title={title}
          description={description}
          headerActions={headerActions}
          footer={footer}
          headerClassName={headerClassName}
          bodyClassName={bodyClassName}
          contentClassName={resolvedContentClassName}
          footerClassName={resolvedFooterClassName}
          inSheet={inSheet}
          showCloseButton={showCloseButton}
          onRequestClose={onRequestClose}
          useAppointmentFooter={useAppointmentFooter}
        >
          {children}
        </DrawerShellInner>
      </div>
    </div>
  );
}

export function DrawerShell({
  open = true,
  onOpenChange,
  variant = "sheet",
  width = "standard",
  title,
  description,
  spineLabel,
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
  const resolvedContentClassName = cn(
    width === "compact" || width === "appointment"
      ? DRAWER_COMPACT_CONTENT_CLASS
      : undefined,
    contentClassName,
  );
  const isAppointmentDrawer = width === "appointment";
  const resolvedFooterClassName = cn(
    width === "compact" ? DRAWER_COMPACT_FOOTER_CLASS : undefined,
    footerClassName,
  );

  const handleRequestClose = () => onOpenChange?.(false);

  if (variant === "panel") {
    return (
      <aside
        className={cn(
          "relative flex h-full min-h-0 w-full max-w-[var(--sheet-width)] shrink-0 flex-col border-l border-border bg-background",
          widthClass,
          !spineLabel && className,
        )}
      >
        <DrawerShellLayout
          spineLabel={spineLabel}
          className={className}
          widthClass={widthClass}
          resolvedContentClassName={resolvedContentClassName}
          resolvedFooterClassName={resolvedFooterClassName}
          headerClassName={headerClassName}
          bodyClassName={bodyClassName}
          footerClassName={footerClassName}
          title={title}
          description={description}
          headerActions={headerActions}
          footer={footer}
          showCloseButton={showCloseButton}
          onRequestClose={handleRequestClose}
          inSheet={false}
          useAppointmentFooter={isAppointmentDrawer}
        >
          {children}
        </DrawerShellLayout>
      </aside>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className={cn(
          "gap-0 p-0",
          spineLabel
            ? APPOINTMENT_DRAWER_SHEET_CONTENT_CLASS
            : "shadow-elevation-lg",
          widthClass,
          stackZ,
          !spineLabel && className,
        )}
      >
        <DrawerShellLayout
          spineLabel={spineLabel}
          className={spineLabel ? className : undefined}
          resolvedContentClassName={resolvedContentClassName}
          resolvedFooterClassName={resolvedFooterClassName}
          headerClassName={headerClassName}
          bodyClassName={bodyClassName}
          footerClassName={footerClassName}
          title={title}
          description={description}
          headerActions={headerActions}
          footer={footer}
          showCloseButton={showCloseButton}
          onRequestClose={handleRequestClose}
          inSheet
          widthClass={widthClass}
          useAppointmentFooter={isAppointmentDrawer}
        >
          {children}
        </DrawerShellLayout>
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
