"use client";

import { DrawerHeaderContent } from "@/components/drawer/drawer-header-content";
import { DrawerPrimaryButton } from "@/components/drawer/drawer-primary-button";
import { DrawerShell, type DrawerShellChrome } from "@/components/layout/drawer-shell";
import {
  DRAWER_BODY_INSET_CLASS,
  DRAWER_FOOTER_CLASS,
  DRAWER_FOOTER_INNER_CLASS,
  DRAWER_MOBILE_SHELL_CLASS,
  DRAWER_SHELL_CLASS,
  DRAWER_SHELL_HEADER_CLASS,
} from "@/lib/design/drawer-tokens";
import { useIsMobile } from "@/lib/hooks/use-mobile";
import { cn } from "@/lib/utils";

export interface OptionsFilterDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  spineLabel?: string;
  applyLabel?: string;
  applyDisabled?: boolean;
  onApply: () => void;
  headerActions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  /** Extra content above the form fields (e.g. View Transactions). */
  leading?: React.ReactNode;
}

/**
 * Shared options/filter drawer chrome (spine + Apply footer + mobile brand).
 * Domain fields stay as children — do not fork this shell per feature.
 */
export function OptionsFilterDrawer({
  open,
  onOpenChange,
  title = "Options",
  spineLabel = "OPTIONS",
  applyLabel = "Apply",
  applyDisabled = false,
  onApply,
  headerActions,
  children,
  className,
  leading,
}: OptionsFilterDrawerProps) {
  const isMobile = useIsMobile();
  const chrome: DrawerShellChrome = isMobile ? "mobile-brand" : "default";

  return (
    <DrawerShell
      open={open}
      onOpenChange={onOpenChange}
      variant="sheet"
      width="appointment"
      chrome={chrome}
      spineLabel={isMobile ? undefined : spineLabel}
      className={cn(
        isMobile ? DRAWER_MOBILE_SHELL_CLASS : DRAWER_SHELL_CLASS,
        className,
      )}
      headerClassName={isMobile ? undefined : DRAWER_SHELL_HEADER_CLASS}
      contentClassName="!px-0 !py-0"
      footerClassName={DRAWER_FOOTER_CLASS}
      title={isMobile ? title : <DrawerHeaderContent title={title} />}
      headerActions={headerActions}
      footer={
        <div className={DRAWER_FOOTER_INNER_CLASS}>
          <DrawerPrimaryButton
            disabled={applyDisabled}
            onClick={() => {
              onApply();
              onOpenChange(false);
            }}
          >
            {applyLabel}
          </DrawerPrimaryButton>
        </div>
      }
    >
      <div className={cn(DRAWER_BODY_INSET_CLASS, "pb-2")}>
        {leading}
        {children}
      </div>
    </DrawerShell>
  );
}
