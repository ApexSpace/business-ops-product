/**
 * @file Temporary shared DTO barrel.
 * Do not add new domain types here.
 * Prefer `features/<domain>/types` or `@business-automation/api-contract` after codegen.
 */

export type {
  AuthContextItem,
  AuthContextType,
  AuthTokensResponse,
  BusinessMemberRole,
  JwtAccessPayload,
  PlatformMemberRole,
  UserMe,
} from "@/features/auth/types/auth-dto";

export type {
  BillingOverview,
  BusinessStatus,
  Industry,
  IndustryLabels,
  IndustryOption,
  IndustryPipelineStage,
  IndustryPipelineTemplate,
  IndustryStatus,
  Plan,
  PlanStatus,
  PlatformUser,
  SubscriptionStatus,
} from "@/features/platform/types/platform-dto";

export type { Contact, ContactTag } from "@/features/contacts/types/contact";

import type { BusinessStatus, Industry } from "@/features/platform/types/platform-dto";
import type { BusinessMemberRole } from "@/features/auth/types/auth-dto";

export interface Business {
  id: string;
  name: string;
  industryId: string | null;
  industry?: Industry | null;
  snapshotId?: string | null;
  snapshotName?: string | null;
  snapshotStatus?: string | null;
  snapshotAppliedAt?: string | null;
  status: BusinessStatus;
  firstName: string | null;
  lastName: string | null;
  displayName: string | null;
  email: string | null;
  phoneCountryCode: string | null;
  phoneNumber: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  zip: string | null;
  website: string | null;
  timezone: string | null;
  logoUrl: string | null;
  addressLine2: string | null;
  taxesAndCurrency?: {
    currencyCode: string;
    currencySymbol: string;
    defaultTaxRate: number;
    pricesIncludeTax: boolean;
  };
  settings: Record<string, unknown> | null;
  createdById: string | null;
  createdAt: string;
  updatedAt: string;
  subscriptionStatus?: import("@/features/platform/types/platform-dto").SubscriptionStatus | null;
  planTierName?: string | null;
  planTierId?: string | null;
  planGroupName?: string | null;
  paymentMethod?: string | null;
  paymentStatus?: string | null;
  latestPaymentAt?: string | null;
  recommendedActionKey?: string | null;
  /** @deprecated Use recommendedActionKey */
  recommendedAction?: string | null;
  currentPeriodEnd?: string | null;
  canAccessWorkspace?: boolean;
  reasonCode?: string;
  reasonLabel?: string;
  needsAttention?: string[];
}

export interface PaginatedMeta {
  total: number;
  page: number;
  limit: number;
  totalPages?: number;
}

export interface PaginatedResult<T> {
  items: T[];
  meta: PaginatedMeta;
}

export interface LeadStats {
  total: number;
  active: number;
  won: number;
  lost: number;
  archived: number;
}

export interface WorkItemStats {
  total: number;
  scheduled: number;
  completed: number;
  pending: number;
}

export interface AppointmentStats {
  today: number;
  upcoming: number;
  cancelledOrNoShow: number;
}

export interface RevenueDayStats {
  amount: string;
  paymentCount: number;
}

export interface DashboardAttentionStats {
  overdueInvoices: number;
  overdueInvoiceBalance: string;
  lowStockProducts: number;
  unreadConversations: number;
}

export interface BusinessDashboardStats {
  contacts: number;
  leads: LeadStats;
  pipelines: number;
  appointments: number;
  appointmentStats: AppointmentStats;
  conversations: number;
  members: number;
  workItems: WorkItemStats;
  revenueToday: RevenueDayStats;
  revenueYesterday?: RevenueDayStats;
  attention: DashboardAttentionStats;
}

export interface DashboardAttentionItem {
  id: string;
  title: string;
  description?: string;
  href: string;
}

export type AppointmentSource =
  | "INTERNAL"
  | "BOOKING_WIDGET"
  | "PUBLIC_LINK"
  | "GOOGLE_SYNC"
  | "IMPORTED";

export interface DashboardFeedAppointment {
  id: string;
  title: string;
  startAt: string;
  endAt: string;
  status: string;
  source: AppointmentSource;
  notes?: string | null;
  serviceName?: string | null;
  assignedTo?: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    displayName?: string | null;
  } | null;
  contact: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    displayName?: string | null;
  };
}

export interface DashboardRecentConversation {
  id: string;
  channel:
    | "FACEBOOK"
    | "INSTAGRAM"
    | "WHATSAPP"
    | "EMAIL"
    | "SMS"
    | "WEBCHAT"
    | "LINKEDIN";
  preview?: string | null;
  lastMessageAt: string;
  unreadCount: number;
  href: string;
  contact?: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    displayName?: string | null;
  } | null;
}

export interface DashboardTaskItem {
  id: string;
  title: string;
  dueAt: string;
  priority?: "LOW" | "MEDIUM" | "HIGH" | null;
  assignedTo?: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    displayName?: string | null;
  } | null;
}

export interface DashboardRevenueCategory {
  id: string;
  label: string;
  amount: string;
  sharePercent: number;
}

export interface DashboardBookingSource {
  source: AppointmentSource;
  label: string;
  count: number;
  deltaPercent: number;
}

export interface DashboardOverview {
  waitingClientsToday: number;
}

export interface DashboardTrendMetric {
  value: number;
  deltaPercent: number;
  points: number[];
}

export interface BusinessDashboardFeed {
  stats: BusinessDashboardStats;
  overview: DashboardOverview;
  todayAppointmentsMetric: DashboardTrendMetric;
  newLeadsMetric: DashboardTrendMetric;
  todayAppointments: DashboardFeedAppointment[];
  attentionItems: DashboardAttentionItem[];
  appointmentsToConfirm: DashboardFeedAppointment[];
  recentConversations: DashboardRecentConversation[];
  followUpTasks: DashboardTaskItem[];
  staffAssignments: DashboardTaskItem[];
  revenueByCategory: DashboardRevenueCategory[];
  bookingsBySource: DashboardBookingSource[];
}

export interface MemberUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  status: string;
}

export interface BusinessMember {
  id: string;
  userId: string;
  businessId: string;
  role: BusinessMemberRole;
  status: string;
  user: MemberUser;
  joinedAt: string | null;
  createdAt: string;
  hasTimeclockPin?: boolean;
  phoneNumber?: string | null;
  gender?: string | null;
  isServiceProvider?: boolean;
  canAssignProductSales?: boolean;
}

export interface AuditLog {
  id: string;
  actorUserId: string | null;
  actorEmail?: string | null;
  businessId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface PlatformDashboardStats {
  businesses: {
    total: number;
    active: number;
    notActive?: number;
    suspended: number;
    archived: number;
  };
  platformUsers: number;
  totalUsers: number;
  contacts: number;
  leads: number;
  activeSubscriptions: number;
  mrr: string;
}

export interface PlatformSettings {
  platformName: string;
  supportEmail: string;
  defaultTrialDays: number;
  maintenanceMode: boolean;
}

export type ServiceStatus = "ACTIVE" | "ARCHIVED";

export interface Service {
  id: string;
  businessId: string;
  categoryId: string;
  categoryName: string;
  /** @deprecated use categoryName */
  category?: string | null;
  name: string;
  description: string | null;
  price: string | null;
  durationMinutes: number;
  sortOrder: number;
  isDemo: boolean;
  hasProcessingTime: boolean;
  processingDurationMinutes: number;
  finishDurationMinutes: number | null;
  hasBufferTime: boolean;
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
  usesProducts: boolean;
  requiresNoStaff: boolean;
  requiresTwoStaff: boolean;
  hasCommissionDeduction: boolean;
  commissionDeductionType: "FLAT" | "PERCENT" | null;
  commissionDeductionValue: string | null;
  staffingMode: "SINGLE_STAFF" | "TWO_STAFF" | "RESOURCE_ONLY";
  clientOccupancyMinutes: number;
  staffBlockedMinutes: number;
  status: ServiceStatus;
  createdAt: string;
  updatedAt: string;
}

export interface LeadServiceSummary {
  id: string;
  name: string;
  category: string | null;
  price: string | null;
}

export type PipelineStageType = "OPEN" | "WON" | "LOST";

export type LeadStatus = "ACTIVE" | "WON" | "LOST" | "ARCHIVED";

export interface PipelineStage {
  id: string;
  pipelineId: string;
  name: string;
  position: number;
  type: PipelineStageType | null;
  createdAt: string;
  updatedAt: string;
}

export interface Pipeline {
  id: string;
  businessId: string;
  name: string;
  isDefault: boolean;
  stages: PipelineStage[];
  createdAt: string;
  updatedAt: string;
}

export interface LeadContactSummary {
  id: string;
  displayName: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
}

export interface LeadStageSummary {
  id: string;
  name: string;
  position: number;
  type: string | null;
}

export interface LeadPipelineSummary {
  id: string;
  name: string;
}

export interface LeadAssigneeSummary {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
}

export interface Lead {
  id: string;
  businessId: string;
  contactId: string | null;
  serviceId: string | null;
  pipelineId: string;
  pipelineStageId: string;
  assignedToId: string | null;
  title: string | null;
  value: string | null;
  status: LeadStatus;
  source: string | null;
  notes: string | null;
  createdById: string | null;
  createdAt: string;
  updatedAt: string;
  contact: LeadContactSummary | null;
  service: LeadServiceSummary | null;
  pipeline: LeadPipelineSummary;
  pipelineStage: LeadStageSummary;
  assignedTo: LeadAssigneeSummary | null;
}

export type WorkItemStatus =
  | "DRAFT"
  | "SCHEDULED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED";

export interface WorkItemContactSummary {
  id: string;
  displayName: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  label: string;
}

export interface WorkItem {
  id: string;
  businessId: string;
  contactId: string;
  serviceId: string | null;
  leadId: string | null;
  title: string;
  type: string | null;
  status: WorkItemStatus;
  description: string | null;
  scheduledAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  amount: string | null;
  assignedToId: string | null;
  createdById: string | null;
  createdAt: string;
  updatedAt: string;
  contact?: WorkItemContactSummary;
  service: LeadServiceSummary | null;
  assignedTo: LeadAssigneeSummary | null;
}

export interface NoteContactSummary {
  id: string;
  label: string;
}

export interface NoteLeadSummary {
  id: string;
  title: string | null;
}

export interface Note {
  id: string;
  businessId: string;
  contactId: string | null;
  leadId: string | null;
  title: string;
  description: string;
  descriptionText: string | null;
  createdById: string | null;
  createdAt: string;
  updatedAt: string;
  contact?: NoteContactSummary | null;
  lead?: NoteLeadSummary | null;
  createdBy?: LeadAssigneeSummary | null;
}

export type TaskStatus = "TODO" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH";

export interface Task {
  id: string;
  businessId: string;
  contactId: string | null;
  leadId: string | null;
  title: string;
  description: string;
  descriptionText: string | null;
  dueAt: string;
  status: TaskStatus;
  priority: TaskPriority | null;
  assignedToId: string | null;
  createdById: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  contact?: NoteContactSummary | null;
  lead?: NoteLeadSummary | null;
  assignedTo?: LeadAssigneeSummary | null;
  createdBy?: LeadAssigneeSummary | null;
}

export type EstimateStatus =
  | "DRAFT"
  | "SENT"
  | "APPROVED"
  | "REJECTED"
  | "EXPIRED"
  | "CONVERTED";

export interface EstimateItem {
  id: string;
  serviceId: string | null;
  title: string;
  description: string | null;
  quantity: string;
  unitPrice: string;
  totalPrice: string;
  createdAt: string;
}

export interface EstimateContactSummary {
  id: string;
  label: string;
}

export interface EstimateWorkItemSummary {
  id: string;
  title: string;
}

export interface Estimate {
  id: string;
  businessId: string;
  contactId: string;
  workItemId: string | null;
  estimateNumber: string;
  status: EstimateStatus;
  issueDate: string;
  expiryDate: string | null;
  subtotal: string;
  taxAmount: string;
  discountAmount: string;
  totalAmount: string;
  notes: string | null;
  termsAndConditions: string | null;
  createdById: string | null;
  createdAt: string;
  updatedAt: string;
  contact?: EstimateContactSummary;
  workItem?: EstimateWorkItemSummary | null;
  items: EstimateItem[];
}

export type InvoiceStatus =
  | "DRAFT"
  | "SENT"
  | "PARTIAL"
  | "PAID"
  | "OVERDUE"
  | "VOID";

export interface InvoiceItem {
  id: string;
  serviceId: string | null;
  title: string;
  description: string | null;
  quantity: string;
  unitPrice: string;
  totalPrice: string;
  createdAt: string;
}

export interface InvoiceEstimateSummary {
  id: string;
  estimateNumber: string;
}

export type InvoicePaymentStatus =
  | "UNPAID"
  | "PARTIALLY_PAID"
  | "PAID"
  | "OVERPAID"
  | "REFUNDED";

export type PaymentProvider = "MANUAL" | "STRIPE";

export interface Invoice {
  id: string;
  businessId: string;
  contactId: string;
  estimateId: string | null;
  workItemId: string | null;
  invoiceNumber: string;
  status: InvoiceStatus;
  issueDate: string;
  dueDate: string | null;
  subtotal: string;
  taxAmount: string;
  discountAmount: string;
  totalAmount: string;
  balanceDue: string;
  publicToken: string;
  publicUrl: string | null;
  paymentStatus: InvoicePaymentStatus;
  paidAmount: string;
  remainingAmount: string;
  lastPaymentAt: string | null;
  stripeCheckoutUrl: string | null;
  stripePaymentLinkId: string | null;
  notes: string | null;
  paymentTerms: string | null;
  termsAndConditions: string | null;
  createdById: string | null;
  createdAt: string;
  updatedAt: string;
  contact?: EstimateContactSummary;
  estimate?: InvoiceEstimateSummary | null;
  workItem?: EstimateWorkItemSummary | null;
  items: InvoiceItem[];
}

export type PaymentMethod =
  | "CASH"
  | "CARD"
  | "BANK_TRANSFER"
  | "WALLET"
  | "GIFT_CARD"
  | "STRIPE"
  | "OTHER";

export type PaymentStatus =
  | "PENDING"
  | "SUCCEEDED"
  | "FAILED"
  | "CANCELLED"
  | "REFUNDED";

export interface PaymentInvoiceSummary {
  id: string;
  invoiceNumber: string;
  totalAmount: string;
  balanceDue: string;
  status: InvoiceStatus;
}

export interface PublicInvoice {
  invoiceNumber: string;
  businessName: string;
  issueDate: string;
  dueDate: string | null;
  contactLabel: string;
  subtotal: string;
  taxAmount: string;
  discountAmount: string;
  totalAmount: string;
  paidAmount: string;
  balanceDue: string;
  paymentStatus: InvoicePaymentStatus;
  currencyCode: string;
  currencySymbol: string;
  isOverdue: boolean;
  canPayOnline: boolean;
  items: InvoiceItem[];
}

export interface Payment {
  id: string;
  businessId: string;
  invoiceId: string;
  contactId: string;
  payableType?: string;
  payableId?: string;
  amount: string;
  method: PaymentMethod;
  status?: PaymentStatus;
  provider: PaymentProvider;
  stripePaymentIntentId: string | null;
  stripeCheckoutSessionId: string | null;
  stripeChargeId: string | null;
  stripeRefundId: string | null;
  providerMetadata: Record<string, unknown> | null;
  reference: string | null;
  notes: string | null;
  paidAt: string | null;
  createdById: string | null;
  createdAt: string;
  updatedAt: string;
  contact?: EstimateContactSummary;
  invoice?: PaymentInvoiceSummary | null;
  createdBy?: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  } | null;
}

export interface PaymentsOverviewMetric {
  count: number;
  amount: string;
}

export interface PaymentsOverview {
  invoices: {
    draft: PaymentsOverviewMetric;
    due: PaymentsOverviewMetric;
    received: PaymentsOverviewMetric;
    overdue: PaymentsOverviewMetric;
  };
  estimates: {
    sent: PaymentsOverviewMetric;
    approved: PaymentsOverviewMetric;
    rejected: PaymentsOverviewMetric;
    converted: PaymentsOverviewMetric;
  };
}

export interface ApiErrorBody {
  success?: false;
  statusCode?: number;
  code?: string;
  message?: string;
  errors?: Record<string, string[]>;
}
