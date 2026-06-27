export type PackageExpirationPolicy = "NEVER" | "AFTER_PURCHASE";
export type PackageCommissionBasis = "REGULAR_PRICE" | "DISCOUNTED_PRICE";
export type PackageServiceGroupQuantityType = "ONE" | "MULTIPLE";
export type ClientPackageStatus =
  | "ACTIVE"
  | "EXPIRED"
  | "DEPLETED"
  | "TRANSFERRED"
  | "DELETED";
export type ClientPackageSource = "STAFF" | "ONLINE";
export type PackageHistoryEventType =
  | "PURCHASED"
  | "REDEEMED"
  | "ADJUSTED"
  | "TRANSFERRED_IN"
  | "TRANSFERRED_OUT"
  | "EXPIRED"
  | "DELETED";

export interface PackageContactSummary {
  id: string;
  name: string;
  email: string | null;
}

export interface PackageServiceGroupItem {
  serviceId: string;
  service: { id: string; name: string };
}

export interface PackageServiceGroup {
  id: string;
  quantity: number;
  quantityType: PackageServiceGroupQuantityType;
  groupPrice: string;
  sortOrder: number;
  items: PackageServiceGroupItem[];
}

export interface PackageTemplate {
  id: string;
  name: string;
  emoji: string | null;
  totalPrice: string;
  chargeTax: boolean;
  expirationPolicy: PackageExpirationPolicy;
  expirationDays: number | null;
  onlineSalesEnabled: boolean;
  shortDescription: string | null;
  description: string | null;
  requireAgreement: boolean;
  agreementText: string | null;
  commissionBasis: PackageCommissionBasis;
  sortOrder: number;
  serviceGroups: PackageServiceGroup[];
  directLink?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PackageHistoryEvent {
  id: string;
  eventType: PackageHistoryEventType;
  description: string | null;
  quantityChange: number | null;
  serviceId: string | null;
  createdAt: string;
}

export interface PackageServiceAllocation {
  serviceId: string;
  serviceName: string;
  remaining: number;
  initialQty: number;
}

export interface ClientPackageListItem {
  id: string;
  contact: PackageContactSummary;
  packageTemplate: {
    id: string;
    name: string;
    emoji: string | null;
    totalPrice: string;
  };
  totalQty: number;
  purchaseDate: string;
  expirationDate: string | null;
  status: ClientPackageStatus;
  source: ClientPackageSource;
  isDemo: boolean;
}

export interface ClientPackageDetail extends ClientPackageListItem {
  serviceAllocations: PackageServiceAllocation[];
  history: PackageHistoryEvent[];
  stripePaymentIntentId: string | null;
}

export interface PackageSettings {
  onlineSalesEnabled: boolean;
  publicSlug: string | null;
  shareableLink: string | null;
  embedScript: string | null;
  overlayLink: string | null;
  stripeReady: boolean;
}

export interface ClientPackagesListFilters {
  contactId?: string;
  search?: string;
}

export interface CreateClientPackageInput {
  contactId: string;
  packageTemplateId: string;
  purchaseDate?: string;
  expirationDate?: string | null;
  isDemo?: boolean;
}

export interface CreatePackageTemplateInput {
  name: string;
  emoji?: string;
  totalPrice: number;
  chargeTax?: boolean;
  expirationPolicy?: PackageExpirationPolicy;
  expirationDays?: number;
  onlineSalesEnabled?: boolean;
  shortDescription?: string;
  description?: string;
  requireAgreement?: boolean;
  agreementText?: string;
  commissionBasis?: PackageCommissionBasis;
}

export interface CreateServiceGroupInput {
  serviceIds: string[];
  quantity: number;
  quantityType?: PackageServiceGroupQuantityType;
  groupPrice: number;
}
