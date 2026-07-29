import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { generateReport } from "@/features/reports/api/reports.api";
import type {
  ReportDocument,
  ReportFilterValues,
} from "@/features/reports/types";

export function useGenerateReport() {
  return useMutation<
    ReportDocument,
    Error,
    { reportKey: string; filters: ReportFilterValues }
  >({
    mutationFn: ({ reportKey, filters }) => generateReport(reportKey, filters),
    onError: (error) => {
      toast.error(error.message || "Failed to generate report");
    },
  });
}
