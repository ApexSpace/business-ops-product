import { api } from "@/lib/api/client";

export type DataIoEntityType =
  | "CONTACT"
  | "SERVICE"
  | "PRODUCT"
  | "LEAD"
  | "NOTE"
  | "GIFT_CARD"
  | "CLIENT_MEMBERSHIP"
  | "CLIENT_PACKAGE"
  | "TASK"
  | "APPOINTMENT"
  | "INVOICE"
  | "ESTIMATE"
  | "PAYMENT"
  | "WORK_ITEM"
  | "OFFER"
  | "FORM_SUBMISSION"
  | "TIME_CARD";

export type ColumnMapping = {
  sourceColumn: string;
  target: string | null;
  action: "map" | "skip" | "append_to_notes";
};

export type DataImportJob = {
  id: string;
  entityType: DataIoEntityType;
  status: string;
  fileAssetId: string | null;
  errorReportAssetId: string | null;
  asyncJobId: string | null;
  mapping: ColumnMapping[] | null;
  options: Record<string, unknown> | null;
  stats: {
    total?: number;
    created?: number;
    updated?: number;
    skipped?: number;
    failed?: number;
    processed?: number;
  } | null;
  warnings: string[] | null;
  sheetName: string | null;
  headerRowNumber: number;
  createdAt: string;
  completedAt: string | null;
};

export type AttachPreview = DataImportJob & {
  preview: {
    format: string;
    headers: string[];
    sheetNames: string[];
    sampleRows: Record<string, string>[];
    inferredMapping: ColumnMapping[];
    fields: Array<{ key: string; label: string }>;
  };
};

export function listDataIoEntities() {
  return api.get<
    Array<{
      entityType: DataIoEntityType;
      supportsImport: boolean;
      supportsExport: boolean;
      fields: Array<{ key: string; label: string }>;
      templateHeaders: string[];
    }>
  >("data-io/entities");
}

export function createDataImport(body: {
  entityType: DataIoEntityType;
  providerPreset?: string;
  timezoneDefault?: string;
}) {
  return api.post<DataImportJob>("data-imports", body);
}

export function attachDataImportFile(
  id: string,
  body: { fileAssetId: string; sheetName?: string; headerRowNumber?: number },
) {
  return api.post<AttachPreview>(`data-imports/${id}/attach-file`, body);
}

export function configureDataImport(
  id: string,
  body: {
    mapping: ColumnMapping[];
    duplicatePolicy?: "SKIP" | "UPDATE" | "CREATE_ALWAYS";
    providerPreset?: string;
    timezoneDefault?: string;
    restoreDeleted?: boolean;
    autoCreateTags?: boolean;
  },
) {
  return api.post<DataImportJob>(`data-imports/${id}/configure`, body);
}

export function startDataImport(id: string) {
  return api.post<DataImportJob & { asyncJobId: string }>(
    `data-imports/${id}/start`,
    {},
  );
}

export function getDataImport(id: string) {
  return api.get<DataImportJob>(`data-imports/${id}`);
}

export function listDataImports(params?: {
  entityType?: DataIoEntityType;
  page?: number;
  limit?: number;
}) {
  return api.getPaginated<DataImportJob>("data-imports", {
    searchParams: params,
  });
}

export async function downloadDataExport(
  entityType: DataIoEntityType,
  search?: string,
) {
  const qs = new URLSearchParams({ entityType });
  if (search) qs.set("search", search);
  const res = await fetch(`/api/backend/data-exports?${qs.toString()}`, {
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error("Export failed");
  }
  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    throw new Error("Export returned JSON instead of CSV. Please try again.");
  }
  const blob = await res.blob();
  const disposition = res.headers.get("content-disposition");
  const match = disposition?.match(/filename="([^"]+)"/i);
  const filename =
    match?.[1] ?? `${entityType.toLowerCase()}-export.csv`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function downloadImportTemplate(entityType: DataIoEntityType) {
  const res = await fetch(
    `/api/backend/data-imports/template?entityType=${entityType}`,
    { credentials: "include" },
  );
  if (!res.ok) throw new Error("Template download failed");
  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    throw new Error("Template returned JSON instead of CSV. Please try again.");
  }
  const blob = await res.blob();
  const disposition = res.headers.get("content-disposition");
  const match = disposition?.match(/filename="([^"]+)"/i);
  const filename =
    match?.[1] ?? `${entityType.toLowerCase()}-import-template.csv`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
