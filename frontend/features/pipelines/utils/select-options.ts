import type { SelectOption } from "@/components/forms/select-field";
import type { Pipeline } from "@/features/pipelines/types";

export const pipelineStageTypeOptions: SelectOption[] = [
  { value: "OPEN", label: "Open" },
  { value: "WON", label: "Won" },
  { value: "LOST", label: "Lost" },
];

export function pipelineSelectOptions(
  pipelines: Pipeline[],
  options?: { includeAll?: boolean },
): SelectOption[] {
  const items = pipelines.map((p) => ({
    value: p.id,
    label: p.isDefault ? `${p.name} (default)` : p.name,
  }));
  if (options?.includeAll) {
    return [{ value: "all", label: "All Pipelines" }, ...items];
  }
  return items;
}
