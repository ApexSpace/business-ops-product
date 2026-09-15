import { api } from "@/lib/api/client";
import { ApiClientError } from "@/lib/api/errors";
import { parseApiError } from "@/lib/api/envelope";
import { buildApiHeaders } from "@/lib/api/headers";
import { fetchWithTimeout } from "@/lib/api/fetch-with-timeout";
import type {
  ReportCatalogItem,
  ReportDocument,
  ReportExportFormat,
  ReportFilterValues,
} from "@/features/reports/types";

export function listReportCatalog() {
  return api.get<ReportCatalogItem[]>("reports");
}

export function generateReport(
  reportKey: string,
  filters: ReportFilterValues,
) {
  return api.post<ReportDocument>(`reports/${reportKey}/generate`, {
    filters,
  });
}

function parseFileNameFromDisposition(
  disposition: string | null,
  fallback: string,
): string {
  if (!disposition) return fallback;
  const utf8Match = /filename\*\s*=\s*UTF-8''([^;]+)/i.exec(disposition);
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1].trim());
    } catch {
      // fall through
    }
  }
  const plainMatch = /filename\s*=\s*"([^"]+)"/i.exec(disposition);
  if (plainMatch?.[1]) return plainMatch[1];
  const unquotedMatch = /filename\s*=\s*([^;]+)/i.exec(disposition);
  if (unquotedMatch?.[1]) return unquotedMatch[1].trim().replace(/^"|"$/g, "");
  return fallback;
}

export async function exportReport(
  reportKey: string,
  format: ReportExportFormat,
  filters: ReportFilterValues,
): Promise<{ blob: Blob; fileName: string }> {
  const url = new URL(
    `/api/backend/reports/${encodeURIComponent(reportKey)}/export`,
    window.location.origin,
  );

  const res = await fetchWithTimeout(
    url.toString(),
    {
      method: "POST",
      credentials: "include",
      headers: buildApiHeaders({ body: {} }),
      body: JSON.stringify({ format, filters }),
    },
    125_000,
  );

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw parseApiError(body, res.status);
  }

  const fallbackExt = format === "pdf" ? "pdf" : "xlsx";
  const fileName = parseFileNameFromDisposition(
    res.headers.get("Content-Disposition"),
    `${reportKey}.${fallbackExt}`,
  );
  const blob = await res.blob();
  if (!(blob instanceof Blob) || blob.size === 0) {
    throw new ApiClientError("Report export returned an empty file", res.status);
  }
  return { blob, fileName,
};
}
