import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface DashboardOverviewHeroProps {
  avatarLabel: string;
  title: string;
  description: string;
  className?: string;
}

export function DashboardOverviewHero({
  avatarLabel,
  title,
  description,
  className,
}: DashboardOverviewHeroProps) {
  return (
    <Card
      className={cn(
        "rounded-[14px] border-[#d8e5ff] bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(236,244,255,0.98))] p-0 shadow-[0_22px_48px_-30px_rgba(55,91,210,0.34)] dark:border-[#243a73] dark:bg-[linear-gradient(180deg,rgba(11,21,48,0.9),rgba(18,34,72,0.96))]",
        className,
      )}
      tone="glass"
    >
      <CardContent className="flex h-full min-h-[126px] flex-col justify-center gap-3 bg-[radial-gradient(circle_at_top_left,rgba(76,124,240,0.14),transparent_48%)] p-4 dark:bg-[radial-gradient(circle_at_top_left,rgba(74,110,224,0.18),transparent_52%)]">
        <div className="flex size-8 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-white shadow-[0_10px_22px_-14px_rgba(55,91,210,0.85)]">
          {avatarLabel}
        </div>
        <div>
          <h1 className="text-[15px] font-bold leading-tight tracking-tight text-[#12172b] dark:text-foreground">
            {title}
          </h1>
          <p className="mt-1 text-[11px] text-[#98a1b5] dark:text-muted-foreground">
            {description}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
