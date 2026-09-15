import type { LucideIcon } from "lucide-react";
import type { DashboardWidgetKey } from "@/lib/config/snapshot/widget-registry";

export type BusinessNicheKey = "default" | "medspa";

export interface BusinessNicheQuickAction {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
}

export interface BusinessNicheDashboardCopy {
  heroLabel: string;
  heroEyebrow: string;
  heroTitle: string;
  heroDescription: string;
  kpiLabels?: Partial<Record<DashboardWidgetKey, string>>;
  kpiWidgetKeys: DashboardWidgetKey[];
  appointmentsToConfirmTitle: string;
  appointmentsToConfirmDescription: string;
  recentConversationsTitle: string;
  recentConversationsDescription: string;
  revenueByCategoryTitle: string;
  bookingsBySourceTitle: string;
  scheduleTitle: string;
  followUpsTitle: string;
  staffAssignmentsTitle: string;
  quickActionsTitle: string;
  quickActions: BusinessNicheQuickAction[];
}

export interface BusinessNicheProfile {
  key: BusinessNicheKey;
  label: string;
  shell: {
    searchPlaceholder: string;
  };
  dashboard: BusinessNicheDashboardCopy;
}
