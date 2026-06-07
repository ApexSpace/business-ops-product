import { api } from "@/lib/api/client";

export type EmailTypeCategory =
  | "membership"
  | "appointments"
  | "invoices"
  | "auth";

export type EmailMessageStatus =
  | "QUEUED"
  | "SENDING"
  | "SENT"
  | "DELIVERED"
  | "BOUNCED"
  | "FAILED";

export interface EmailPreference {
  emailType: string;
  category: EmailTypeCategory;
  label: string;
  description: string;
  enabled: boolean;
  isCustomized: boolean;
  systemOnly?: boolean;
  businessConfigurable?: boolean;
}

export interface EmailTemplateSummary {
  emailType: string;
  label: string;
  category: EmailTypeCategory;
  description: string;
  isCustomized: boolean;
  updatedAt: string | null;
}

export interface EmailTemplateDetail {
  emailType: string;
  label: string;
  category: EmailTypeCategory;
  variables: string[];
  subject: string;
  htmlBody: string;
  textBody: string | null;
  isCustomized: boolean;
  updatedAt: string | null;
}

export interface EmailLog {
  id: string;
  emailType: string;
  toEmail: string;
  subject: string;
  status: EmailMessageStatus;
  entityType: string | null;
  entityId: string | null;
  errorMessage: string | null;
  sentAt: string | null;
  deliveredAt: string | null;
  createdAt: string;
}

export const EMAIL_TYPE_OPTIONS = [
  { value: "membership.invite", label: "Team invite" },
  { value: "appointment.confirmation", label: "Booking confirmation" },
  { value: "appointment.owner_notification", label: "New booking notification" },
  { value: "appointment.reminder", label: "Appointment reminder" },
  { value: "appointment.cancelled", label: "Appointment cancelled" },
  { value: "appointment.rescheduled", label: "Appointment rescheduled" },
  { value: "invoice.sent", label: "Invoice sent" },
  { value: "invoice.payment_link", label: "Payment link" },
  { value: "invoice.paid_receipt", label: "Payment receipt" },
] as const;

export const EMAIL_STATUS_OPTIONS: { value: EmailMessageStatus; label: string }[] =
  [
    { value: "QUEUED", label: "Queued" },
    { value: "SENDING", label: "Sending" },
    { value: "SENT", label: "Sent" },
    { value: "DELIVERED", label: "Delivered" },
    { value: "BOUNCED", label: "Bounced" },
    { value: "FAILED", label: "Failed" },
  ];

export function listEmailPreferences() {
  return api.get<EmailPreference[]>("/email-notifications/preferences");
}

export function updateEmailPreferences(
  preferences: { emailType: string; enabled: boolean }[],
) {
  return api.patch<EmailPreference[]>("/email-notifications/preferences", {
    preferences,
  });
}

export function listEmailTemplates() {
  return api.get<EmailTemplateSummary[]>("/email-notifications/templates");
}

export function getEmailTemplate(emailType: string) {
  return api.get<EmailTemplateDetail>(
    `/email-notifications/templates/${encodeURIComponent(emailType)}`,
  );
}

export function updateEmailTemplate(
  emailType: string,
  body: { subject: string; htmlBody: string; textBody?: string },
) {
  return api.patch<EmailTemplateDetail>(
    `/email-notifications/templates/${encodeURIComponent(emailType)}`,
    body,
  );
}

export function previewEmailTemplate(
  emailType: string,
  body: {
    subject: string;
    htmlBody: string;
    textBody?: string;
    variables?: Record<string, string>;
  },
) {
  return api.post<{ subject: string; htmlBody: string; textBody: string | null }>(
    `/email-notifications/templates/${encodeURIComponent(emailType)}/preview`,
    body,
  );
}

export function resetEmailTemplate(emailType: string) {
  return api.post<EmailTemplateDetail>(
    `/email-notifications/templates/${encodeURIComponent(emailType)}/reset`,
    {},
  );
}

export function listEmailLogs(params?: {
  page?: number;
  limit?: number;
  emailType?: string;
  status?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set("page", String(params.page));
  if (params?.limit) searchParams.set("limit", String(params.limit));
  if (params?.emailType) searchParams.set("emailType", params.emailType);
  if (params?.status) searchParams.set("status", params.status);
  if (params?.search) searchParams.set("search", params.search);
  if (params?.dateFrom) searchParams.set("dateFrom", params.dateFrom);
  if (params?.dateTo) searchParams.set("dateTo", params.dateTo);
  const qs = searchParams.toString();
  return api.get<{
    items: EmailLog[];
    meta: { total: number; page: number; limit: number };
  }>(`/email-notifications/logs${qs ? `?${qs}` : ""}`);
}

export function emailStatusLabel(status: EmailMessageStatus): string {
  switch (status) {
    case "QUEUED":
      return "Queued";
    case "SENDING":
      return "Sending";
    case "SENT":
      return "Sent";
    case "DELIVERED":
      return "Delivered";
    case "BOUNCED":
      return "Bounced";
    case "FAILED":
      return "Failed";
    default:
      return status;
  }
}

export function emailCategoryLabel(category: EmailTypeCategory): string {
  switch (category) {
    case "membership":
      return "Team";
    case "appointments":
      return "Appointments";
    case "invoices":
      return "Invoices & payments";
    case "auth":
      return "Account (system)";
    default:
      return category;
  }
}

export function emailCategoryDescription(category: EmailTypeCategory): string {
  switch (category) {
    case "membership":
      return "Emails sent when inviting or managing team members.";
    case "appointments":
      return "Booking confirmations, reminders, and schedule change notifications.";
    case "invoices":
      return "Invoice delivery, payment links, and payment receipts.";
    case "auth":
      return "Platform-managed account emails. These cannot be disabled.";
    default:
      return "";
  }
}

export function entityLinkForLog(log: EmailLog): string | null {
  if (!log.entityType || !log.entityId) return null;

  switch (log.entityType) {
    case "Invoice":
      return `/business/finance/invoices/${log.entityId}`;
    case "Appointment":
      return `/business/operations/appointments/${log.entityId}`;
    case "BusinessMembership":
      return `/business/settings/team`;
    case "Contact":
      return `/business/crm/contacts/${log.entityId}`;
    default:
      return null;
  }
}
