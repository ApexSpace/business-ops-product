import { api } from "@/lib/api/client";
import type {
  ClientPackageDetail,
  ClientPackageListItem,
  ClientPackagesListFilters,
  CreateClientPackageInput,
  CreatePackageTemplateInput,
  CreateServiceGroupInput,
  PackageSettings,
  PackageTemplate,
} from "@/features/packages/types";

export function listPackageTemplates() {
  return api.get<PackageTemplate[]>("package-templates");
}

export function getPackageTemplate(id: string) {
  return api.get<PackageTemplate>(`package-templates/${id}`);
}

export function createPackageTemplate(body: CreatePackageTemplateInput) {
  return api.post<PackageTemplate>("package-templates", body);
}

export function updatePackageTemplate(
  id: string,
  body: CreatePackageTemplateInput,
) {
  return api.patch<PackageTemplate>(`package-templates/${id}`, body);
}

export function deletePackageTemplate(id: string) {
  return api.delete(`package-templates/${id}`);
}

export function reorderPackageTemplates(ids: string[]) {
  return api.post("package-templates/reorder", { ids });
}

export function addPackageServiceGroup(
  templateId: string,
  body: CreateServiceGroupInput,
) {
  return api.post(`package-templates/${templateId}/service-groups`, body);
}

export function updatePackageServiceGroup(
  templateId: string,
  groupId: string,
  body: CreateServiceGroupInput,
) {
  return api.patch(
    `package-templates/${templateId}/service-groups/${groupId}`,
    body,
  );
}

export function deletePackageServiceGroup(templateId: string, groupId: string) {
  return api.delete(
    `package-templates/${templateId}/service-groups/${groupId}`,
  );
}

export function listClientPackages(filters: ClientPackagesListFilters = {}) {
  return api.getPaginated<ClientPackageListItem>("client-packages", {
    searchParams: filters,
  });
}

export function listAvailableClientPackages(
  contactId: string,
  serviceId: string,
) {
  return api.get<
    Array<ClientPackageListItem & { matchingRemaining: number }>
  >("client-packages/available", {
    searchParams: { contactId, serviceId },
  });
}

export function getClientPackage(id: string) {
  return api.get<ClientPackageDetail>(`client-packages/${id}`);
}

export function createClientPackage(body: CreateClientPackageInput) {
  return api.post<ClientPackageDetail>("client-packages", body);
}

export function deleteClientPackage(id: string) {
  return api.delete(`client-packages/${id}`);
}

export function transferClientPackage(
  id: string,
  targetContactId: string,
) {
  return api.post<ClientPackageDetail>(`client-packages/${id}/transfer`, {
    targetContactId,
  });
}

export function adjustClientPackageQuantities(
  id: string,
  allocations: Array<{ serviceId: string; remaining: number }>,
) {
  return api.patch<ClientPackageDetail>(`client-packages/${id}/quantities`, {
    allocations,
  });
}

export function updateClientPackageExpiration(
  id: string,
  expirationDate: string | null,
) {
  return api.patch<ClientPackageDetail>(`client-packages/${id}/expiration`, {
    expirationDate,
  });
}

export function getPackageSettings() {
  return api.get<PackageSettings>("package-settings");
}

export function updatePackageSettings(body: { onlineSalesEnabled?: boolean }) {
  return api.patch<PackageSettings>("package-settings", body);
}

export function getPublicPackageCatalog(slug: string) {
  return api.get<{
    business: { id: string; name: string,
};
    packages: Array<{
      id: string;
      name: string;
      emoji: string | null;
      totalPrice: string;
      shortDescription: string | null;
    }>;
    stripeReady: boolean;
  }>(`public/packages/${slug}`);
}

export function getPublicPackageCheckout(slug: string, templateId: string) {
  return api.get<{
    business: { id: string; name: string,
};
    package: {
      id: string;
      name: string;
      emoji: string | null;
      totalPrice: string;
      shortDescription: string | null;
      description: string | null;
      requireAgreement: boolean;
      agreementText: string | null;
      serviceGroups: PackageTemplate["serviceGroups"];
    };
    stripeReady: boolean;
  }>(`public/packages/${slug}/${templateId}`);
}

export function initiatePublicPackageCheckout(
  slug: string,
  templateId: string,
  body: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  },
) {
  return api.post<{
    clientSecret: string;
    paymentIntentId: string;
    publishableKey: string | null;
    stripeAccountId: string;
    totalPrice: string;
  }>(`public/packages/${slug}/${templateId}/checkout`, body);
}
