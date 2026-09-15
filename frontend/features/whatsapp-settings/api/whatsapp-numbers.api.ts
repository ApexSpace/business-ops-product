import { api } from "@/lib/api/client";

export type WhatsAppNumberStatus = "ACTIVE" | "INACTIVE" | "ERROR";

export interface WhatsAppNumber {
  id: string;
  phoneNumber: string;
  displayName: string;
  messagingLimit: string | null;
  qualityRating: string | null;
  status: WhatsAppNumberStatus;
  lastSyncedAt: string | null;
  wabaId: string | null;
  wabaName: string | null;
  isDefault: boolean;
}

export interface WhatsAppOverview {
  connected: boolean;
  integrationStatus?: string;
  connectedAccountName?: string | null;
  wabaId?: string | null;
  wabaName?: string | null;
  defaultPhoneNumber?: string | null;
  defaultNumber?: WhatsAppNumber | null;
}

export function getWhatsAppOverview() {
  return api.get<WhatsAppOverview>("integrations/business/whatsapp/overview");
}

export function listWhatsAppNumbers() {
  return api.get<WhatsAppNumber[]>("integrations/business/whatsapp/numbers");
}
