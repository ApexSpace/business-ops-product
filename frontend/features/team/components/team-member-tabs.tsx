"use client";

import { cn } from "@/lib/utils";
import {
  TEAM_MEMBER_TABS,
  type TeamMemberTabId,
} from "@/features/team/constants/team-member-tabs";

type Props = {
  activeTab: TeamMemberTabId;
  onTabChange: (tab: TeamMemberTabId) => void;
  hidePermissionsAndCompensation?: boolean;
};

export function TeamMemberTabs({
  activeTab,
  onTabChange,
  hidePermissionsAndCompensation,
}: Props) {
  const tabs = TEAM_MEMBER_TABS.filter((tab) => {
    if (!hidePermissionsAndCompensation) return true;
    return tab.id !== "permissions" && tab.id !== "compensation";
  });

  return (
    <nav className="flex w-44 shrink-0 flex-col border-r bg-muted/20 py-3">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onTabChange(tab.id)}
          className={cn(
            "px-4 py-2.5 text-left text-sm transition-colors",
            activeTab === tab.id
              ? "border-r-2 border-primary bg-background font-medium text-primary"
              : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
          )}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
