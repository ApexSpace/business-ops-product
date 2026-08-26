import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { listReportCatalog } from "@/features/reports/api/reports.api";
import type { ReportCategoryGroup } from "@/features/reports/types";
import { queryKeys } from "@/lib/query/keys";

export function useReportsCatalog() {
  const query = useQuery({
    queryKey: queryKeys.reports.catalog(),
    queryFn: listReportCatalog,
  });

  const groups = useMemo<ReportCategoryGroup[]>(() => {
    const items = query.data ?? [];
    const byCategory = new Map<string, ReportCategoryGroup>();
    for (const item of items) {
      let group = byCategory.get(item.category);
      if (!group) {
        group = {
          category: item.category,
          categoryLabel: item.categoryLabel,
          reports: [],
        };
        byCategory.set(item.category, group);
      }
      group.reports.push(item);
    }
    return Array.from(byCategory.values());
  }, [query.data]);

  return { ...query, groups,
};
}
