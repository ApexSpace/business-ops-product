export type SnapshotStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export interface SnapshotNavItem {
  key: string;
  route: string;
  icon: string;
  labelKey: string;
  order: number;
  visible?: boolean;
  requiredRoles?: string[];
}

export interface SnapshotDashboardWidget {
  key: string;
  order: number;
  visible?: boolean;
}

export interface SnapshotQuickLink {
  href: string;
  labelKey?: string;
  label?: string;
  order?: number;
  visible?: boolean;
}

export interface SnapshotBranding {
  productName?: string;
  accentColor?: string;
  logoUrl?: string;
  publicPageTitle?: string;
}

export interface SnapshotDashboardConfig {
  widgets: SnapshotDashboardWidget[];
  quickLinks: SnapshotQuickLink[];
}

export interface SnapshotPipelineStage {
  sourceKey?: string;
  name: string;
  type?: "OPEN" | "WON" | "LOST";
}

export interface SnapshotPipelineAsset {
  sourceKey: string;
  name: string;
  stages: SnapshotPipelineStage[];
}

export interface SnapshotServiceAsset {
  sourceKey: string;
  name: string;
  description?: string;
  durationMinutes?: number;
  price?: number;
}

export interface SnapshotTagAsset {
  sourceKey: string;
  name: string;
  color?: string;
}

export interface SnapshotCalendarAsset {
  sourceKey: string;
  name: string;
  availabilityTemplate?: Record<string, unknown>;
}

export interface SnapshotChatbotRuleAsset {
  sourceKey: string;
  trigger: string;
  response: string;
}

export interface SnapshotChatbotAsset {
  sourceKey: string;
  name: string;
  rules: SnapshotChatbotRuleAsset[];
}

export interface SnapshotEmailPreferenceAsset {
  emailType: string;
  enabled: boolean;
}

export interface SnapshotEmailTemplateAsset {
  emailType: string;
  subject: string;
  htmlBody: string;
  textBody?: string;
}

export interface SnapshotAssets {
  terminology: Record<string, string>;
  navigation: SnapshotNavItem[];
  dashboard: SnapshotDashboardConfig;
  crm?: {
    pipelines?: SnapshotPipelineAsset[];
    tags?: SnapshotTagAsset[];
    services?: SnapshotServiceAsset[];
  };
  calendars?: SnapshotCalendarAsset[];
  chatbots?: SnapshotChatbotAsset[];
  emails?: {
    preferences?: SnapshotEmailPreferenceAsset[];
    templates?: SnapshotEmailTemplateAsset[];
  };
  branding?: SnapshotBranding;
  integrations?: string[];
}

export interface Snapshot {
  id: string;
  name: string;
  description?: string | null;
  status: SnapshotStatus;
  assets: SnapshotAssets;
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: {
    businesses: number;
  };
}

export interface SnapshotListItem {
  id: string;
  name: string;
  description?: string | null;
  status: SnapshotStatus;
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: {
    businesses: number;
  };
}

export interface SnapshotContext {
  snapshotId: string | null;
  snapshotName: string;
  contextVersion: string;
  terminology: Record<string, string>;
  navigation: SnapshotNavItem[];
  dashboard: SnapshotDashboardConfig;
  branding: SnapshotBranding;
}
