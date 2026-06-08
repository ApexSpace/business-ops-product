import type {
  AppointmentStats,
  LeadStats,
  WorkItemStats,
} from "@/lib/types/api";

export interface PlatformBusinessUtilizationCrm {
  contacts: number;
  leads: LeadStats;
  pipelines: number;
  services: number;
  tags: number;
}

export interface PlatformBusinessUtilizationOperations {
  calendars: number;
  appointments: number;
  appointmentStats: AppointmentStats;
  workItems: WorkItemStats;
}

export interface PlatformBusinessUtilizationFinance {
  estimates: number;
  invoices: number;
  invoicesPaid: number;
  payments: number;
}

export interface PlatformBusinessUtilizationCommunications {
  conversations: number;
  chatbots: number;
  chatbotRules: number;
  emailTemplatesCustomized: number;
  emailPreferencesEnabled: number;
}

export interface PlatformBusinessUtilizationIntegrationProvider {
  key: string;
  name: string;
}

export interface PlatformBusinessUtilizationIntegrations {
  connected: number;
  providers: PlatformBusinessUtilizationIntegrationProvider[];
}

export interface PlatformBusinessUtilizationTeam {
  activeMembers: number;
  invitedMembers: number;
}

export interface PlatformBusinessUtilizationBlueprint {
  snapshotId: string | null;
  snapshotName: string | null;
  snapshotStatus: string | null;
  snapshotAppliedAt: string | null;
  industryName: string | null;
  provisionsByType: Record<string, number>;
}

export interface PlatformBusinessUtilizationActivity {
  lastAuditAt: string | null;
}

export interface PlatformBusinessUtilization {
  crm: PlatformBusinessUtilizationCrm;
  operations: PlatformBusinessUtilizationOperations;
  finance: PlatformBusinessUtilizationFinance;
  communications: PlatformBusinessUtilizationCommunications;
  integrations: PlatformBusinessUtilizationIntegrations;
  team: PlatformBusinessUtilizationTeam;
  blueprint: PlatformBusinessUtilizationBlueprint;
  activity: PlatformBusinessUtilizationActivity;
}
