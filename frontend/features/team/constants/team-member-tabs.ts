export const TEAM_MEMBER_TABS = [
  { id: "details", label: "Details" },
  { id: "notifications", label: "Notifications" },
  { id: "permissions", label: "Permissions" },
  { id: "services", label: "Services" },
  { id: "work-hours", label: "Work hours" },
  { id: "compensation", label: "Compensation" },
] as const;

export type TeamMemberTabId = (typeof TEAM_MEMBER_TABS)[number]["id"];

export function isTeamMemberTab(value: string | null): value is TeamMemberTabId {
  return TEAM_MEMBER_TABS.some((tab) => tab.id === value);
}
