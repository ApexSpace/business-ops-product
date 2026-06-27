import {
  Bell,
  Boxes,
  Briefcase,
  Calendar,
  ClipboardList,
  Contact,
  CreditCard,
  FileText,
  Gift,
  GitBranch,
  LayoutDashboard,
  MessageSquare,
  Package,
  Palette,
  Plug,
  Receipt,
  Settings,
  ShoppingBag,
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
  "shopping-bag": ShoppingBag,
  gift: Gift,
  boxes: Boxes,
  package: Package,
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
