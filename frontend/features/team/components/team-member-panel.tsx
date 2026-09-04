"use client";

import { Loader2 } from "lucide-react";
import { EntityDetailTabs } from "@/components/layout/entity-detail-tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreActionsButton } from "@/components/ui/more-actions-button";
import { ProfileAvatar } from "@/components/ui/profile-avatar";
import type { TeamMemberDetail } from "@/features/team/api/team.api";
import { memberDisplayName } from "@/features/team/components/team-sidebar";
import { MemberCompensationTab } from "@/features/team/components/tabs/member-compensation-tab";
import { MemberDetailsTab } from "@/features/team/components/tabs/member-details-tab";
import { MemberNotificationsTab } from "@/features/team/components/tabs/member-notifications-tab";
import { MemberPermissionsTab } from "@/features/team/components/tabs/member-permissions-tab";
import { MemberServicesTab } from "@/features/team/components/tabs/member-services-tab";
import { MemberWorkHoursTab } from "@/features/team/components/tabs/member-work-hours-tab";
import {
  TEAM_MEMBER_TABS,
  type TeamMemberTabId,
} from "@/features/team/constants/team-member-tabs";
import { SETTINGS_CONTENT_SHELL_CLASS } from "@/lib/design/settings-form-tokens";
import { cn } from "@/lib/utils";

function formatMemberSince(joinedAt: string | null | undefined): string | null {
  if (!joinedAt) return null;
  const date = new Date(joinedAt);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

type TeamMemberPanelProps = {
  member: TeamMemberDetail;
  activeTab: TeamMemberTabId;
  onTabChange: (tab: string | null) => void;
  canEditDetails: boolean;
  canManageAdmin: boolean;
  hidePermissionsAndCompensation: boolean;
  onArchive?: () => void;
  onResendInvite?: () => void;
  isResendingInvite?: boolean;
};

export function TeamMemberPanel({
  member,
  activeTab,
  onTabChange,
  canEditDetails,
  canManageAdmin,
  hidePermissionsAndCompensation,
  onArchive,
  onResendInvite,
  isResendingInvite,
}: TeamMemberPanelProps) {
  const name = memberDisplayName(member);
  const since = formatMemberSince(member.joinedAt);

  const tabs = TEAM_MEMBER_TABS.filter((tab) => {
    if (!hidePermissionsAndCompensation) return true;
    return tab.id !== "permissions" && tab.id !== "compensation";
  }).map((tab) => ({ value: tab.id, label: tab.label }));

  const menuItems: Array<{
    key: string;
    label: string;
    onClick: () => void;
    destructive?: boolean;
    disabled?: boolean;
  }> = [];

  if (canEditDetails && member.status === "INVITED" && onResendInvite) {
    menuItems.push({
      key: "resend",
      label: isResendingInvite ? "Resending…" : "Resend invite",
      onClick: onResendInvite,
      disabled: isResendingInvite,
    });
  }
  if (onArchive) {
    menuItems.push({
      key: "archive",
      label: "Archive staff member",
      onClick: onArchive,
      destructive: true,
    });
  }

  return (
    <div className={cn(SETTINGS_CONTENT_SHELL_CLASS, "max-w-4xl")}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <ProfileAvatar name={name} size="lg" className="size-14" />
          <div className="min-w-0 space-y-1">
            <h2 className="truncate text-2xl font-semibold tracking-tight">
              {name}
            </h2>
            {since ? (
              <p className="text-sm text-muted-foreground">
                Staff member since {since}
              </p>
            ) : null}
          </div>
        </div>
        {menuItems.length > 0 ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<MoreActionsButton aria-label="Staff member actions" />}
            />
            <DropdownMenuContent align="end" className="w-48">
              {menuItems.map((item) => (
                <DropdownMenuItem
                  key={item.key}
                  variant={item.destructive ? "destructive" : undefined}
                  disabled={item.disabled}
                  onClick={item.onClick}
                >
                  {item.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>

      <EntityDetailTabs
        value={activeTab}
        onValueChange={(value) => onTabChange(value as TeamMemberTabId)}
        tabs={tabs}
        variant="panel"
        className="px-0"
        aria-label="Staff member sections"
      />

      {activeTab === "details" ? (
        <MemberDetailsTab member={member} canManage={canEditDetails} />
      ) : null}
      {activeTab === "notifications" ? (
        <MemberNotificationsTab
          userId={member.userId}
          canManage={canEditDetails}
        />
      ) : null}
      {activeTab === "permissions" && !hidePermissionsAndCompensation ? (
        <MemberPermissionsTab
          userId={member.userId}
          role={member.role}
          canManage={canManageAdmin}
        />
      ) : null}
      {activeTab === "services" ? (
        <MemberServicesTab
          userId={member.userId}
          canManage={canEditDetails}
        />
      ) : null}
      {activeTab === "work-hours" ? (
        <MemberWorkHoursTab
          userId={member.userId}
          canManage={canEditDetails}
        />
      ) : null}
      {activeTab === "compensation" && !hidePermissionsAndCompensation ? (
        <MemberCompensationTab
          userId={member.userId}
          role={member.role}
          canManage={canManageAdmin}
        />
      ) : null}
    </div>
  );
}

export function TeamMemberPanelLoading() {
  return (
    <div className="flex flex-1 items-center justify-center py-12">
      <Loader2 className="size-6 animate-spin text-muted-foreground" />
    </div>
  );
}
