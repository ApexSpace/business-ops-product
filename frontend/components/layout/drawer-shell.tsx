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
  DRAWER_SHELL_HEADER_ROW_CLASS,
  DRAWER_SHELL_HEADER_ACTIONS_CLASS,
  DRAWER_SHELL_HEADER_ACTION_CLASS,
  DRAWER_SHELL_TITLE_CLASS,
  DRAWER_SHELL_DESCRIPTION_CLASS,
  DRAWER_SHELL_HEADER_CLASS,
  DRAWER_CLOSE_ACTION_CLASS,
  DRAWER_CONTENT_PANEL_CLASS,
  DRAWER_MOBILE_CLOSE_ACTION_CLASS,
  DRAWER_MOBILE_HEADER_ACTIONS_CLASS,
  DRAWER_MOBILE_HEADER_CLASS,
  DRAWER_MOBILE_HEADER_ROW_CLASS,
  DRAWER_MOBILE_SHEET_CONTENT_CLASS,
  DRAWER_MOBILE_SHELL_CLASS,
  DRAWER_MOBILE_TITLE_CLASS,
  DRAWER_SHEET_CONTENT_CLASS,
  drawerShellWidthClass,
  type DrawerShellWidthTier,
} from "@/lib/design/drawer-tokens";
import { cn } from "@/lib/utils";

export type DrawerShellChrome = "default" | "mobile-brand";

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
  /**
   * Visual chrome. `mobile-brand` matches Figma mobile sidebars:
   * full-bleed purple header, close on the left, no spine.
   */
  chrome?: DrawerShellChrome;
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
  chrome = "default",
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
  | "chrome"
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
  const isMobileBrand = chrome === "mobile-brand";
  const defaultHeaderClass = DRAWER_SHELL_HEADER_CLASS;

  return (
    <>
      {title ? (
        isMobileBrand ? (
          <SheetHeader
            className={cn(
              DRAWER_MOBILE_HEADER_CLASS,
              headerClassName,
            )}
          >
            <div
              data-slot="sheet-header-row"
              className={DRAWER_MOBILE_HEADER_ROW_CLASS}
            >
              <div className="flex items-center justify-start">
                {inSheet && showCloseButton && onRequestClose ? (
                  <IconButton
                    type="button"
                    variant="ghost"
                    aria-label="Close"
                    className={DRAWER_MOBILE_CLOSE_ACTION_CLASS}
                    onClick={onRequestClose}
                  >
                    <DrawerCloseIcon />
                  </IconButton>
                ) : (
                  <span className="size-11" aria-hidden />
                )}
              </div>
              <div className="min-w-0">
                <Title className={DRAWER_MOBILE_TITLE_CLASS}>
                  {title}
                </Title>
                {description ? (
                  <Description
                    className="mt-1 truncate text-center text-[12px] font-medium leading-none text-white/80"
                    {...(inSheet && isRichDescription
                      ? { render: <div /> }
                      : {})}
                  >
                    {description}
                  </Description>
                ) : null}
              </div>
              <div className={DRAWER_MOBILE_HEADER_ACTIONS_CLASS}>
                {headerActions ?? <span className="size-11" aria-hidden />}
              </div>
            </div>
          </SheetHeader>
        ) : (
          <SheetHeader className={cn(defaultHeaderClass, headerClassName)}>
            <div
              data-slot="sheet-header-row"
              className={DRAWER_SHELL_HEADER_ROW_CLASS}
            >
              <Title
                className={cn(
                  DRAWER_SHELL_TITLE_CLASS,
                  "min-w-0",
                )}
              >
                {title}
              </Title>
              {headerActions || (inSheet && showCloseButton) ? (
                <div className={DRAWER_SHELL_HEADER_ACTIONS_CLASS}>
                  {headerActions}
                  {inSheet && showCloseButton && onRequestClose ? (
                    <IconButton
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Close"
                      className={DRAWER_CLOSE_ACTION_CLASS}
                      onClick={onRequestClose}
                    >
                      <DrawerCloseIcon />
                    </IconButton>
                  ) : null}
                </div>
              ) : null}
              {description ? (
                <Description
                  className={cn(DRAWER_SHELL_DESCRIPTION_CLASS, "col-start-1")}
                  {...(inSheet && isRichDescription
                    ? { render: <div /> }
                    : {})}
                >
                  {description}
                </Description>
              ) : null}
            </div>
          </SheetHeader>
        )
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
  chrome = "default",
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
  chrome?: DrawerShellChrome;
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
  const isMobileBrand = chrome === "mobile-brand";
  const hasSpine = Boolean(spineLabel) && !isMobileBrand;

  return (
    <div
      className={cn(
        "flex h-full min-h-0 w-full",
        hasSpine && cn("overflow-hidden", className),
        hasSpine && widthClass,
        hasSpine && stackZ,
        isMobileBrand && DRAWER_MOBILE_SHELL_CLASS,
      )}
    >
      {hasSpine && spineLabel ? <DrawerSpine label={spineLabel} /> : null}
      <div
        className={cn(
          "flex min-h-0 min-w-0 flex-1 flex-col",
          hasSpine &&
            cn(DRAWER_CONTENT_PANEL_CLASS, "overflow-hidden"),
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
          chrome={chrome}
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
  chrome = "default",
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
  const isMobileBrand = chrome === "mobile-brand";
  const effectiveWidth: DrawerShellWidthTier = isMobileBrand
    ? "appointment-mobile"
    : width;
  const effectiveSpineLabel = isMobileBrand ? undefined : spineLabel;
  const widthClass = drawerShellWidthClass(effectiveWidth);
  const stackZ =
    stackLevel === "overlay"
      ? "z-[60] [&+[data-slot=sheet-overlay]]:z-[55]"
      : "";
  const resolvedContentClassName = cn(
    effectiveWidth === "compact" ||
      effectiveWidth === "appointment" ||
      effectiveWidth === "appointment-mobile"
      ? DRAWER_COMPACT_CONTENT_CLASS
      : undefined,
    contentClassName,
  );
  const isAppointmentDrawer =
    effectiveWidth === "appointment" ||
    effectiveWidth === "appointment-mobile";
  const resolvedFooterClassName = cn(
    effectiveWidth === "compact" ? DRAWER_COMPACT_FOOTER_CLASS : undefined,
    footerClassName,
  );

  const handleRequestClose = () => onOpenChange?.(false);

  if (variant === "panel") {
    return (
      <aside
        className={cn(
          "relative flex h-full min-h-0 w-full max-w-[var(--sheet-width)] shrink-0 flex-col border-l border-border bg-background",
          widthClass,
          !effectiveSpineLabel && className,
        )}
      >
        <DrawerShellLayout
          spineLabel={effectiveSpineLabel}
          chrome={chrome}
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
          isMobileBrand
            ? DRAWER_MOBILE_SHEET_CONTENT_CLASS
            : effectiveSpineLabel
              ? DRAWER_SHEET_CONTENT_CLASS
              : "shadow-elevation-lg",
          widthClass,
          stackZ,
          !effectiveSpineLabel && className,
        )}
      >
        <DrawerShellLayout
          spineLabel={effectiveSpineLabel}
          chrome={chrome}
          className={effectiveSpineLabel ? className : undefined}
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
