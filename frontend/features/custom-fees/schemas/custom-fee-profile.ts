import { z } from "zod";
import type {
  CreateCustomFeeBody,
  CustomFee,
  CustomFeeApplicationScope,
  CustomFeeAmountType,
  CustomFeePaymentMethod,
} from "@/features/custom-fees/api/custom-fees.api";

export const customFeeFormSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(200),
    applicationScope: z.enum(["ENTIRE_SALE", "PAYMENT_METHOD"]),
    paymentMethods: z.array(z.string()).default([]),
    amountType: z.enum(["FIXED", "PERCENTAGE"]),
    amount: z.string().trim().min(1, "Amount is required"),
    isEnabled: z.boolean().default(true),
  })
  .superRefine((values, ctx) => {
    const amount = Number(values.amount);
    if (Number.isNaN(amount) || amount <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Amount must be greater than zero",
        path: ["amount"],
      });
    }
    if (values.amountType === "PERCENTAGE" && (amount > 100 || amount < 1)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Percentage must be between 1 and 100",
        path: ["amount"],
      });
    }
    if (
      values.applicationScope === "PAYMENT_METHOD" &&
      values.paymentMethods.length === 0
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Select at least one payment method",
        path: ["paymentMethods"],
      });
    }
  });

export type CustomFeeFormValues = z.infer<typeof customFeeFormSchema>;

export const customFeeFormDefaults: CustomFeeFormValues = {
  name: "",
  applicationScope: "ENTIRE_SALE",
  paymentMethods: [],
  amountType: "FIXED",
  amount: "",
  isEnabled: true,
};

export function customFeeToForm(fee: CustomFee): CustomFeeFormValues {
  return {
    name: fee.name,
    applicationScope: fee.applicationScope,
    paymentMethods: fee.paymentMethods,
    amountType: fee.amountType,
    amount: fee.amount,
    isEnabled: fee.isEnabled,
  };
}

export function customFeeFormToApiBody(
  values: CustomFeeFormValues,
): CreateCustomFeeBody {
  return {
    name: values.name.trim(),
    applicationScope: values.applicationScope as CustomFeeApplicationScope,
    paymentMethods:
      values.applicationScope === "PAYMENT_METHOD"
        ? (values.paymentMethods as CustomFeePaymentMethod[])
        : [],
    amountType: values.amountType as CustomFeeAmountType,
    amount: Number(values.amount),
    isEnabled: values.isEnabled,
  };
}

export function formatCustomFeeAmount(fee: Pick<CustomFee, "amountType" | "amount">): string {
  if (fee.amountType === "PERCENTAGE") {
    return `${fee.amount}%`;
  }
  return `$${Number(fee.amount).toFixed(2)}`;
}

export function formatCustomFeeScope(
  fee: Pick<CustomFee, "applicationScope" | "paymentMethods">,
  methodLabels: Record<string, string>,
): string {
  if (fee.applicationScope === "ENTIRE_SALE") {
    return "Entire sale";
  }
  return fee.paymentMethods.map((method) => methodLabels[method] ?? method).join(", ");
}
