import type { SelectOption } from "@/components/forms/select-field";
import {
  allFilterOption,
  FILTER_ALL_LABELS,
} from "@/lib/ui/filter-labels";

export const businessStatusFilterOptions: SelectOption[] = [
  { value: "all", label: "All Statuses" },
  { value: "ACTIVE", label: "Active" },
  { value: "NOT_ACTIVE", label: "Not Active" },
  { value: "SUSPENDED", label: "Suspended" },
  { value: "ARCHIVED", label: "Archived" },
];

export const businessStatusOptions: SelectOption[] = [
  { value: "ACTIVE", label: "Active" },
  { value: "NOT_ACTIVE", label: "Not Active" },
  { value: "SUSPENDED", label: "Suspended" },
  { value: "ARCHIVED", label: "Archived" },
];

export const platformRoleFilterOptions: SelectOption[] = [
  { value: "all", label: "All Roles" },
  { value: "SUPER_ADMIN", label: "Super Admin" },
  { value: "PLATFORM_ADMIN", label: "Platform Admin" },
  { value: "SUPPORT", label: "Support" },
];

export const platformRoleOptions: SelectOption[] = [
  { value: "PLATFORM_ADMIN", label: "Platform Admin" },
  { value: "SUPPORT", label: "Support" },
];

export const planStatusFilterOptions: SelectOption[] = [
  { value: "all", label: "All Statuses" },
  { value: "ACTIVE", label: "Active" },
  { value: "ARCHIVED", label: "Archived" },
];

export const subscriptionStatusFilterOptions: SelectOption[] = [
  allFilterOption(FILTER_ALL_LABELS.statuses),
  { value: "ACTIVE", label: "Active" },
  { value: "TRIALING", label: "Trialing" },
  { value: "PENDING_PAYMENT", label: "Pending Payment" },
  { value: "PAST_DUE", label: "Past Due" },
  { value: "CANCELED", label: "Canceled" },
  { value: "EXPIRED", label: "Expired" },
  { value: "INTERNAL", label: "Internal" },
];

export const subscriptionStatusOptions: SelectOption[] = [
  { value: "ACTIVE", label: "Active" },
  { value: "TRIALING", label: "Trialing" },
  { value: "PENDING_PAYMENT", label: "Pending Payment" },
  { value: "CANCELED", label: "Canceled" },
  { value: "EXPIRED", label: "Expired" },
  { value: "INTERNAL", label: "Internal" },
];

export const subscriptionPaymentMethodOptions: SelectOption[] = [
  { value: "NOT_SELECTED", label: "Not Selected" },
  { value: "STRIPE", label: "Stripe" },
  { value: "BANK_TRANSFER", label: "Bank Transfer" },
  { value: "WISE", label: "Wise" },
  { value: "PAYPAL", label: "PayPal" },
  { value: "CASH", label: "Cash" },
  { value: "JAZZCASH", label: "JazzCash" },
  { value: "EASYPAISA", label: "EasyPaisa" },
  { value: "MANUAL_INVOICE", label: "Manual Invoice (offline)" },
  { value: "FREE_INTERNAL", label: "Free Internal" },
];

export const billingCycleOptions: SelectOption[] = [
  { value: "MONTHLY", label: "Monthly" },
  { value: "YEARLY", label: "Yearly" },
  { value: "ONE_TIME", label: "One-time" },
  { value: "CUSTOM", label: "Custom" },
];

export const subscriptionPaymentStatusOptions: SelectOption[] = [
  { value: "NOT_REQUIRED", label: "Not Required" },
  { value: "PENDING", label: "Pending" },
  { value: "PAID", label: "Paid" },
  { value: "FAILED", label: "Failed" },
  { value: "REFUNDED", label: "Refunded" },
  { value: "PARTIALLY_PAID", label: "Partially Paid" },
  { value: "OVERDUE", label: "Overdue" },
];

export const subscriptionPaymentStatusFilterOptions: SelectOption[] = [
  { value: "all", label: "All Payment Statuses" },
  ...subscriptionPaymentStatusOptions,
];

export const industryStatusFilterOptions: SelectOption[] = [
  { value: "all", label: "All Statuses" },
  { value: "ACTIVE", label: "Active" },
  { value: "ARCHIVED", label: "Archived" },
];

export const industryStatusOptions: SelectOption[] = [
  { value: "ACTIVE", label: "Active" },
  { value: "ARCHIVED", label: "Archived" },
];

export const planGroupStatusFilterOptions: SelectOption[] = [
  { value: "all", label: "All Statuses" },
  { value: "DRAFT", label: "Draft" },
  { value: "PUBLISHED", label: "Published" },
  { value: "ARCHIVED", label: "Archived" },
];

export const planGroupStatusOptions: SelectOption[] = [
  { value: "DRAFT", label: "Draft" },
  { value: "PUBLISHED", label: "Published" },
  { value: "ARCHIVED", label: "Archived" },
];

export const snapshotStatusFilterOptions: SelectOption[] = [
  { value: "all", label: "All Statuses" },
  { value: "DRAFT", label: "Draft" },
  { value: "PUBLISHED", label: "Published" },
  { value: "ARCHIVED", label: "Archived" },
];

export const snapshotStatusOptions: SelectOption[] = [
  { value: "DRAFT", label: "Draft" },
  { value: "PUBLISHED", label: "Published" },
  { value: "ARCHIVED", label: "Archived" },
];

export const capabilityStatusFilterOptions: SelectOption[] = [
  { value: "all", label: "All Statuses" },
  { value: "ACTIVE", label: "Active" },
  { value: "DRAFT", label: "Draft" },
  { value: "INACTIVE", label: "Inactive" },
  { value: "DEPRECATED", label: "Deprecated" },
];

export const capabilityStatusOptions: SelectOption[] = [
  { value: "DRAFT", label: "Draft" },
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
  { value: "DEPRECATED", label: "Deprecated" },
];

export const createCapabilityStatusOptions: SelectOption[] = [
  { value: "DRAFT", label: "Draft" },
  { value: "ACTIVE", label: "Active" },
];

export const capabilityModuleStatusOptions: SelectOption[] = [
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
];

export const capabilityFeatureStatusOptions: SelectOption[] = [
  { value: "INTERNAL", label: "Internal" },
  { value: "BETA", label: "Beta" },
  { value: "ACTIVE", label: "Active" },
  { value: "DISABLED", label: "Disabled" },
  { value: "DEPRECATED", label: "Deprecated" },
];

export const capabilityNavigationStatusOptions: SelectOption[] = [
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
];

export const capabilityFeatureSourceOptions: SelectOption[] = [
  { value: "CODE", label: "Code" },
  { value: "MANUAL", label: "Manual" },
];

export const subscriptionEventTypeFilterOptions: SelectOption[] = [
  allFilterOption(FILTER_ALL_LABELS.eventTypes),
  { value: "CREATED", label: "Created" },
  { value: "STATUS_CHANGED", label: "Status Changed" },
  { value: "PLAN_CHANGED", label: "Plan Changed" },
  { value: "UPGRADED", label: "Upgraded" },
  { value: "DOWNGRADED", label: "Downgraded" },
  { value: "TRIAL_STARTED", label: "Trial Started" },
  { value: "TRIAL_EXTENDED", label: "Trial Extended" },
  { value: "TRIAL_EXPIRED", label: "Trial Expired" },
  { value: "PAYMENT_MARKED_PAID", label: "Payment Marked Paid" },
  { value: "PAYMENT_PENDING", label: "Payment Pending" },
  { value: "PAYMENT_FAILED", label: "Payment Failed" },
  { value: "PAYMENT_REFUNDED", label: "Payment Refunded" },
  { value: "PARTIAL_PAYMENT_RECORDED", label: "Partial Payment" },
  { value: "CANCELED", label: "Canceled" },
  { value: "EXPIRED", label: "Expired" },
  { value: "REACTIVATED", label: "Reactivated" },
  { value: "SUSPENDED", label: "Suspended" },
  { value: "BUSINESS_STATUS_CHANGED", label: "Business Status Changed" },
  { value: "CAPABILITIES_SYNCED", label: "Capabilities Synced" },
  { value: "SNAPSHOT_CHANGED", label: "Snapshot Changed" },
  { value: "MANUAL_ADJUSTMENT", label: "Manual Adjustment" },
];

export const subscriptionEventSourceFilterOptions: SelectOption[] = [
  allFilterOption(FILTER_ALL_LABELS.sources),
  { value: "ADMIN", label: "Admin" },
  { value: "SYSTEM", label: "System" },
  { value: "PUBLIC_SIGNUP", label: "Public Signup" },
  { value: "WEBHOOK", label: "Webhook" },
  { value: "IMPORT", label: "Import" },
];

export const subscriptionEventSeverityFilterOptions: SelectOption[] = [
  allFilterOption(FILTER_ALL_LABELS.severities),
  { value: "INFO", label: "Info" },
  { value: "WARNING", label: "Warning" },
  { value: "CRITICAL", label: "Critical" },
];

export const subscriptionPaymentTypeFilterOptions: SelectOption[] = [
  allFilterOption(FILTER_ALL_LABELS.paymentTypes),
  { value: "SUBSCRIPTION", label: "Subscription" },
  { value: "SETUP_FEE", label: "Setup Fee" },
  { value: "TRIAL_CONVERSION", label: "Trial Conversion" },
  { value: "UPGRADE_PRORATION", label: "Upgrade Proration" },
  { value: "REFUND", label: "Refund" },
  { value: "CREDIT", label: "Credit" },
  { value: "ADJUSTMENT", label: "Adjustment" },
  { value: "MANUAL_PAYMENT", label: "Manual Payment" },
];

export const subscriptionPaymentDirectionFilterOptions: SelectOption[] = [
  allFilterOption(FILTER_ALL_LABELS.directions),
  { value: "INCOMING", label: "Incoming" },
  { value: "OUTGOING", label: "Outgoing" },
];

export const subscriptionPaymentMethodFilterOptions: SelectOption[] = [
  allFilterOption(FILTER_ALL_LABELS.methods),
  ...subscriptionPaymentMethodOptions,
];
