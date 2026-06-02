export type AuthContextType = "platform" | "business";

export type PlatformMemberRole =
  | "SUPER_ADMIN"
  | "PLATFORM_ADMIN"
  | "SUPPORT";

export type BusinessMemberRole = "OWNER" | "ADMIN" | "MEMBER";

export type BusinessStatus = "ACTIVE" | "SUSPENDED" | "ARCHIVED";

export interface AuthContextItem {
  type: AuthContextType;
  businessId?: string;
  businessName?: string;
  platformRole?: PlatformMemberRole;
  businessRole?: BusinessMemberRole;
  /** Opened via platform staff access (no direct membership). */
  viaPlatform?: boolean;
}

export interface AuthTokensResponse {
  accessToken: string;
  refreshToken: string;
  contexts: AuthContextItem[];
}

export interface UserMe {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  status: string;
  lastLoginAt: string | null;
  contexts: AuthContextItem[];
}

export interface JwtAccessPayload {
  sub: string;
  email: string;
  context: AuthContextType;
  platformRole?: PlatformMemberRole;
  businessId?: string;
  businessRole?: BusinessMemberRole;
}

export interface Business {
  id: string;
  name: string;
  slug: string;
  industryId: string | null;
  industry?: Industry | null;
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
}

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

export interface PaginatedMeta {
  total: number;
  page: number;
  limit: number;
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

export interface BusinessDashboardStats {
  contacts: number;
  leads: LeadStats;
  pipelines: number;
  appointments: number;
  appointmentStats: AppointmentStats;
  conversations: number;
  members: number;
  workItems: WorkItemStats;
}

export interface ContactTag {
  id: string;
  name: string;
}

export interface Contact {
  id: string;
  businessId: string;
  firstName: string | null;
  lastName: string | null;
  displayName: string | null;
  companyName: string | null;
  email: string | null;
  phoneCountryCode: string | null;
  phoneNumber: string | null;
  phone: string | null;
  timezone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  zip: string | null;
  avatarUrl: string | null;
  source: string | null;
  createdById: string | null;
  createdAt: string;
  updatedAt: string;
  label: string;
  tags: ContactTag[];
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
}

export interface AuditLog {
  id: string;
  actorUserId: string | null;
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

export interface PlatformSettings {
  platformName: string;
  supportEmail: string;
  defaultTrialDays: number;
  maintenanceMode: boolean;
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

export type ServiceStatus = "ACTIVE" | "ARCHIVED";

export interface Service {
  id: string;
  businessId: string;
  name: string;
  category: string | null;
  description: string | null;
  price: string | null;
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
  | "STRIPE"
  | "OTHER";

export interface PaymentInvoiceSummary {
  id: string;
  invoiceNumber: string;
  totalAmount: string;
  balanceDue: string;
  status: InvoiceStatus;
}

export interface Payment {
  id: string;
  businessId: string;
  invoiceId: string;
  contactId: string;
  amount: string;
  method: PaymentMethod;
  reference: string | null;
  notes: string | null;
  paidAt: string;
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
