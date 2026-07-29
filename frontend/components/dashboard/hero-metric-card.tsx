import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface HeroMetricCardProps {
  label: string;
  value: string | number;
  trendLabel?: string;
  trendDirection?: "up" | "down";
  sparklinePoints?: number[];
  className?: string;
}

function buildSparklinePath(points: number[]): string {
  if (points.length === 0) {
    return "";
  }

  const width = 54;
  const height = 24;
  const max = Math.max(...points, 1);
  const min = Math.min(...points, 0);
  const range = Math.max(max - min, 1);

  return points
    .map((point, index) => {
      const x = (index / Math.max(points.length - 1, 1)) * width;
      const y = height - ((point - min) / range) * (height - 4) - 2;
      return `${x},${y}`;
    })
    .join(" ");
}

export function HeroMetricCard({
  label,
  value,
  trendLabel,
  trendDirection = "up",
  sparklinePoints = [],
  className,
}: HeroMetricCardProps) {
  const sparklineStroke = trendDirection === "down" ? "#dc3545" : "#1f9d63";

  return (
    <Card
      className={cn(
        "glass-hover relative overflow-hidden rounded-[14px] p-0",
        className,
      )}
      tone="glass"
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <p className="text-[10.5px] font-semibold tracking-[0.08em] text-[#98a1b5] uppercase">
              {label}
            </p>
            <p className="text-[26px] font-bold tabular-nums tracking-tight text-[#12172b] dark:text-foreground">
              {value}
            </p>
            {trendLabel ? (
              <p
                className={cn(
                  "text-[11px]",
                  trendDirection === "up" ? "text-[#1f9d63]" : "text-[#dc3545]",
                )}
              >
                {trendLabel}
              </p>
            ) : null}
          </div>
          {sparklinePoints.length > 0 ? (
            <svg
              width="54"
              height="24"
              viewBox="0 0 54 24"
              className="mt-2 shrink-0"
              aria-hidden
            >
              <polyline
                points={buildSparklinePath(sparklinePoints)}
                fill="none"
                stroke={sparklineStroke}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
