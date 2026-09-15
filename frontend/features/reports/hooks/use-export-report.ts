import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { exportReport } from "@/features/reports/api/reports.api";
import type {
  ReportExportFormat,
  ReportFilterValues,
} from "@/features/reports/types";

function downloadBlob(blob: Blob, fileName: string) {
  if (typeof window === "undefined") return;
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}

export function useExportReport() {
  return useMutation<
    void,
    Error,
    {
      reportKey: string;
      format: ReportExportFormat;
      filters: ReportFilterValues;
    }
  >({
    mutationFn: async ({ reportKey, format, filters }) => {
      const { blob, fileName } = await exportReport(reportKey, format, filters);
      downloadBlob(blob, fileName);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to export report");
    },
  });
}
