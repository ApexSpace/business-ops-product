import { api } from "@/lib/api/client";

export type CustomFeeApplicationScope = "ENTIRE_SALE" | "PAYMENT_METHOD";
export type CustomFeeAmountType = "FIXED" | "PERCENTAGE";
export type CustomFeePaymentMethod =
  | "CASH"
  | "CARD"
  | "BANK_TRANSFER"
  | "WALLET"
  | "GIFT_CARD"
  | "STRIPE"
  | "OTHER";

export interface CustomFee {
  id: string;
  businessId: string;
  name: string;
  applicationScope: CustomFeeApplicationScope;
  paymentMethods: CustomFeePaymentMethod[];
  amountType: CustomFeeAmountType;
  amount: string;
  isEnabled: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export type CreateCustomFeeBody = {
  name: string;
  applicationScope: CustomFeeApplicationScope;
  paymentMethods?: CustomFeePaymentMethod[];
  amountType: CustomFeeAmountType;
  amount: number;
  isEnabled?: boolean;
};

export type UpdateCustomFeeBody = Partial<CreateCustomFeeBody>;

export function listCustomFees(filters: { page?: number; limit?: number; search?: string } = {}) {
  return api.getPaginated<CustomFee>("custom-fees", { searchParams: filters });
}

export function getCustomFee(id: string) {
  return api.get<CustomFee>(`custom-fees/${id}`);
}

export function createCustomFee(body: CreateCustomFeeBody) {
  return api.post<CustomFee>("custom-fees", body);
}

export function updateCustomFee(id: string, body: UpdateCustomFeeBody) {
  return api.patch<CustomFee>(`custom-fees/${id}`, body);
}

export function deleteCustomFee(id: string) {
  return api.delete<void>(`custom-fees/${id}`, { searchParams: { confirm: true } });
}
