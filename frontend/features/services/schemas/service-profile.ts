import { z } from "zod";
import type { Service, ServiceStatus } from "@/features/services/types";

export const serviceProfileSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  category: z.string().max(100).optional(),
  description: z.string().max(5000).optional(),
  price: z.string().optional(),
  status: z.enum(["ACTIVE", "ARCHIVED"]),
});

export type ServiceProfileFormValues = z.infer<typeof serviceProfileSchema>;

export const serviceProfileDefaultValues: ServiceProfileFormValues = {
  name: "",
  category: "",
  description: "",
  price: "",
  status: "ACTIVE",
};

export function serviceToProfileForm(service: Service): ServiceProfileFormValues {
  return {
    name: service.name,
    category: service.category ?? "",
    description: service.description ?? "",
    price: service.price ?? "",
    status: service.status,
  };
}

export function profileFormToServiceApiBody(values: ServiceProfileFormValues) {
  const price =
    values.price === "" || values.price == null
      ? undefined
      : Number(values.price);

  return {
    name: values.name.trim(),
    category: values.category?.trim() || undefined,
    description: values.description?.trim() || undefined,
    price: price !== undefined && !Number.isNaN(price) ? price : undefined,
    status: values.status as ServiceStatus,
  };
}
