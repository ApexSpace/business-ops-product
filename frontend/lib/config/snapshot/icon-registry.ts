import {
  Bell,
  Briefcase,
  Calendar,
  ClipboardList,
  Contact,
  CreditCard,
  FileText,
  GitBranch,
  LayoutDashboard,
  MessageSquare,
  Palette,
  Plug,
  Receipt,
  Settings,
  Users,
  Workflow,
  Zap,
  type LucideIcon,
} from "lucide-react";

export const SNAPSHOT_ICON_REGISTRY: Record<string, LucideIcon> = {
  "layout-dashboard": LayoutDashboard,
  contact: Contact,
  "message-square": MessageSquare,
  "git-branch": GitBranch,
  "clipboard-list": ClipboardList,
  calendar: Calendar,
  "credit-card": CreditCard,
  settings: Settings,
  users: Users,
  workflow: Workflow,
  briefcase: Briefcase,
  bell: Bell,
  palette: Palette,
  plug: Plug,
  receipt: Receipt,
  "file-text": FileText,
  zap: Zap,
};

export const DEFAULT_SNAPSHOT_ICON: LucideIcon = LayoutDashboard;

export function resolveSnapshotIcon(iconKey: string): LucideIcon {
  return SNAPSHOT_ICON_REGISTRY[iconKey] ?? DEFAULT_SNAPSHOT_ICON;
}
