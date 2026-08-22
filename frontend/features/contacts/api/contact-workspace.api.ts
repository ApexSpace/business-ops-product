import { api } from "@/lib/api/client";
import type { ClientMembershipListItem } from "@/features/memberships/types";
import type { PaginatedResult } from "@/features/contacts/types";

export type ContactTimelineType =
  | "contact_created"
  | "appointment"
  | "note"
  | "sale"
  | "form"
  | "lead"
  | "work_item"
  | "task";

export interface ContactTimelineEvent {
  id: string;
  type: ContactTimelineType;
  title: string;
  description?: string | null;
  occurredAt: string;
  entityType: string;
  entityId: string;
  lineTitle?: string | null;
  amount?: string | null;
  subtotal?: string | null;
  total?: string | null;
  paymentSummary?: string | null;
  statusCode?: string | null;
  subtitle?: string | null;
  footer?: string | null;
  requested?: boolean | null;
}

export interface ContactWalletTransaction {
  id: string;
  amount: string;
  type: string;
  description?: string | null;
  createdAt: string;
}

export interface ContactWallet {
  balance: { amount: string; currency: string };
  transactions: ContactWalletTransaction[];
  paymentMethods: unknown[];
  giftCards: {
    id: string;
    number: string;
    balance: string;
    status: string;
    createdAt: string;
  }[];
  capabilities: { paymentMethods: boolean; giftCards: boolean };
}

export interface ContactAdjustment {
  id: string;
  contactId: string;
  serviceId: string;
  serviceName: string;
  durationMinutes: number;
  createdAt: string;
  updatedAt: string;
}

export interface ContactMemberships {
  available: boolean;
  memberships: ClientMembershipListItem[];
  packages: import("@/features/packages/types").ClientPackageListItem[];
  message: string | null;
}

export interface ContactPrintAppointment {
  id: string;
  title: string;
  startAt: string;
  endAt: string;
  status: string;
  serviceName?: string | null;
  providerName?: string | null;
  calendarName?: string | null;
}

export interface ContactPrintAppointments {
  businessName: string;
  contactLabel: string;
  contactPhone?: string | null;
  contactEmail?: string | null;
  generatedAt: string;
  appointments: ContactPrintAppointment[];
}

export function getContactTimeline(
  contactId: string,
  filters: { types?: ContactTimelineType[]; page?: number; limit?: number } = {},
) {
  return api.getPaginated<ContactTimelineEvent>(
    `contacts/${contactId}/timeline`,
    { searchParams: filters },
  );
}

export function getContactWallet(contactId: string) {
  return api.get<ContactWallet>(`contacts/${contactId}/wallet`);
}

export function adjustContactWallet(
  contactId: string,
  body: { amount: number; type: "MANUAL_CREDIT" | "MANUAL_DEBIT"; description?: string },
) {
  return api.post<ContactWallet>(`contacts/${contactId}/wallet/adjust`, body);
}

export function listContactAdjustments(contactId: string) {
  return api.get<ContactAdjustment[]>(`contacts/${contactId}/adjustments`);
}

export function createContactAdjustment(
  contactId: string,
  body: { serviceId: string; durationMinutes: number },
) {
  return api.post<ContactAdjustment>(`contacts/${contactId}/adjustments`, body);
}

export function updateContactAdjustment(
  contactId: string,
  adjustmentId: string,
  body: { durationMinutes: number },
) {
  return api.patch<ContactAdjustment>(
    `contacts/${contactId}/adjustments/${adjustmentId}`,
    body,
  );
}

export function deleteContactAdjustment(contactId: string, adjustmentId: string) {
  return api.delete<void>(
    `contacts/${contactId}/adjustments/${adjustmentId}`,
  );
}

export function getContactMemberships(contactId: string) {
  return api.get<ContactMemberships>(`contacts/${contactId}/memberships`);
}

export function getContactPrintAppointments(contactId: string) {
  return api.get<ContactPrintAppointments>(
    `contacts/${contactId}/appointments/print`,
  );
}

export type ContactTimelineResult = PaginatedResult<ContactTimelineEvent>;
