export type BusinessStatus = "ACTIVE" | "SUSPENDED" | "ARCHIVED";

export type IndustryStatus = "ACTIVE" | "ARCHIVED";

export interface IndustryLabels {
  contacts: string;
  pipelines: string;
  leads: string;
  workItems: string;
  appointments: string;
  conversations: string;
}

export interface IndustryPipelineStage {
  name: string;
  type?: "OPEN" | "WON" | "LOST";
}

export interface IndustryPipelineTemplate {
  pipelineName: string;
  stages: IndustryPipelineStage[];
}

export interface Industry {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  labels: IndustryLabels;
  pipelineTemplate: IndustryPipelineTemplate;
  status: IndustryStatus;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface IndustryOption {
  id: string;
  name: string;
  slug: string;
  labels: IndustryLabels;
}

import type { PlatformMemberRole } from "@/features/auth/types/auth-dto";

export interface PlatformUser {
  id: string;
  userId: string;
  role: PlatformMemberRole;
  email: string;
  firstName: string | null;
  lastName: string | null;
  status: string;
  createdAt: string;
}

export type PlanStatus = "ACTIVE" | "ARCHIVED";

export interface Plan {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  priceMonthly: string;
  priceYearly: string | null;
  features: string[] | null;
  status: PlanStatus;
  createdAt: string;
  updatedAt: string;
}

export type SubscriptionStatus =
  | "ACTIVE"
  | "TRIALING"
  | "PAST_DUE"
  | "CANCELED";

export interface BillingOverview {
  mrr: string;
  activeSubscriptions: number;
  trialingSubscriptions: number;
  pastDueSubscriptions: number;
  canceledSubscriptions: number;
}

export interface BillingSubscription {
  id: string;
  businessId: string;
  businessName: string;
  businessSlug: string;
  planId: string;
  planName: string;
  priceMonthly: string;
  status: SubscriptionStatus;
  currentPeriodEnd: string | null;
  canceledAt: string | null;
  createdAt: string;
}
