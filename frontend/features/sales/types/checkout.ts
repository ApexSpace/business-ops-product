import type { CheckoutAdvancedSettings } from "@/features/checkout-advanced-settings/api/checkout-advanced-settings.api";

export type CheckoutStatus =
  | "OPEN"
  | "PAID"
  | "PARTIAL"
  | "VOID"
  | "DRAFT"
  | "SENT"
  | "OVERDUE";

export type CheckoutLineType =
  | "SERVICE"
  | "PRODUCT"
  | "ACCOUNT_BALANCE_DEPOSIT"
  | "GIFT_CARD"
  | "PACKAGE"
  | "OFFER"
  | "CUSTOM";

export interface CheckoutItem {
  id: string;
  lineType: CheckoutLineType;
  serviceId?: string | null;
  productId?: string | null;
  variantId?: string | null;
  staffUserId?: string | null;
  title: string;
  description?: string | null;
  quantity: string;
  unitPrice: string;
  totalPrice: string;
  sortOrder: number;
  staff?: { id: string; label: string } | null;
  metadata?: Record<string, unknown> | null;
}

export interface Checkout {
  id: string;
  contactId: string;
  saleNumber: string;
  displaySequence: number;
  invoiceNumber: string;
  status: CheckoutStatus;
  isOpen: boolean;
  issueDate: string;
  subtotal: string;
  taxAmount: string;
  discountAmount: string;
  totalAmount: string;
  balanceDue: string;
  notes?: string | null;
  closedAt?: string | null;
  contact?: { id: string; label: string,
};
  items: CheckoutItem[];
  appliedOffers?: Array<{
    offerId: string;
    offerName: string;
    totalDiscount: string;
  }>;
  tipAmount?: string;
  advancedSettings?: CheckoutAdvancedSettings;
}

export interface CheckoutServicePickerItem {
  id: string;
  name: string;
  price: string;
  durationMinutes: number;
}

export interface CheckoutProductPickerItem {
  productId: string;
  variantId?: string | null;
  name: string;
  variantLabel?: string | null;
  unitPrice: string;
  stockQuantity: number;
  trackInventory: boolean;
  assignStaffToSale?: boolean;
  isNonRetail?: boolean;
}

export interface CloseCheckoutResult {
  checkout: Checkout;
  completed: boolean;
  paymentIds: string[];
  stripeTenders: {
    paymentId: string;
    clientSecret: string;
    stripePaymentIntentId: string;
  }[];
}
