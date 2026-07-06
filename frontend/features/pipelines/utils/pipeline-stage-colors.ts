import type { PipelineStage } from "@/features/pipelines/types";

export interface PipelineStageAccent {
  /** Tailwind classes for the stage dot */
  dotClass: string;
  /** Tailwind classes for the count pill */
  pillClass: string;
  /** CSS color for card left accent bar */
  accentColor: string;
}

const POSITION_PALETTE: PipelineStageAccent[] = [
  {
    dotClass: "bg-muted-foreground",
    pillClass: "bg-muted text-muted-foreground",
    accentColor: "var(--muted-foreground)",
  },
  {
    dotClass: "bg-warning",
    pillClass: "bg-warning-subtle text-warning",
    accentColor: "var(--warning)",
  },
  {
    dotClass: "bg-primary",
    pillClass: "bg-primary-tint text-primary",
    accentColor: "var(--primary)",
  },
  {
    dotClass: "bg-[hsl(192_70%_40%)]",
    pillClass: "bg-[hsl(192_70%_96%)] text-[hsl(192_70%_32%)]",
    accentColor: "hsl(192 70% 40%)",
  },
  {
    dotClass: "bg-success",
    pillClass: "bg-success-subtle text-success",
    accentColor: "var(--success)",
  },
];

const WON_ACCENT: PipelineStageAccent = {
  dotClass: "bg-success",
  pillClass: "bg-success-subtle text-success",
  accentColor: "var(--success)",
};

const LOST_ACCENT: PipelineStageAccent = {
  dotClass: "bg-muted-foreground/70",
  pillClass: "bg-muted text-muted-foreground",
  accentColor: "var(--muted-foreground)",
};

/** Consistent stage accent keyed by pipeline order and stage type. */
export function getPipelineStageAccent(
  stage: PipelineStage,
  positionIndex: number,
): PipelineStageAccent {
  if (stage.type === "WON") return WON_ACCENT;
  if (stage.type === "LOST") return LOST_ACCENT;
  return POSITION_PALETTE[positionIndex % POSITION_PALETTE.length];
}
