"use client";

import { usePathname } from "next/navigation";
import { SettingsWorkspaceChrome } from "@/features/settings/components/settings-workspace-chrome";
import { isMigratedSettingsAppPath } from "@/lib/config/navigation/business-settings-menu";
import { isFullScreenEditorRoute } from "@/lib/config/navigation/full-screen-editor-routes";

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
    return (
      <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col">
        {children}
      </div>
    );
  }

  return <SettingsWorkspaceChrome>{children}</SettingsWorkspaceChrome>;
}
