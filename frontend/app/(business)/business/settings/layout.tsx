"use client";

import { usePathname } from "next/navigation";
import { SettingsWorkspaceChrome } from "@/features/settings/components/settings-workspace-chrome";
import { isAppsMasterDetailWorkspacePath } from "@/components/shell/shell-full-bleed-paths";
import { isMigratedSettingsAppPath } from "@/lib/config/navigation/business-settings-menu";
import { isFullScreenEditorRoute } from "@/lib/config/navigation/full-screen-editor-routes";
import { APPS_MASTER_DETAIL_ROUTE_SHELL_CLASS } from "@/lib/design/workspace-tokens";
import { cn } from "@/lib/utils";

/** Settings use the purple top navbar; secondary nav lives in this chrome. */
export default function BusinessSettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  if (
    isFullScreenEditorRoute(pathname) ||
    isMigratedSettingsAppPath(pathname)
  ) {
    const masterDetail = isAppsMasterDetailWorkspacePath(pathname);
    return (
      <div
        className={cn(
          "flex min-h-0 w-full min-w-0 flex-1 flex-col",
          masterDetail && APPS_MASTER_DETAIL_ROUTE_SHELL_CLASS,
        )}
      >
        {children}
      </div>
    );
  }

  return <SettingsWorkspaceChrome>{children}</SettingsWorkspaceChrome>;
}
