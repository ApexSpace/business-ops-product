import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  label: string;
  value: string | number;
  description?: string;
  href?: string;
  icon?: LucideIcon;
  className?: string;
}

export function KpiCard({
  label,
  value,
  description,
  href,
  icon: Icon,
  className,
}: KpiCardProps) {
  const content = (
    <Card
      className={cn(
        "glass-hover h-full min-h-[6rem] rounded-[1.35rem] p-0 transition-colors",
        href && "hover:-translate-y-0.5",
        className,
      )}
      tone="glass"
    >
      <CardContent className="flex h-full flex-col p-4">
        <div className="flex items-start justify-between gap-2">
          <span className="text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
            {label}
          </span>
          {Icon ? (
            <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-white/65 text-primary dark:bg-white/8">
              <Icon className="size-4 shrink-0" />
            </div>
          ) : null}
        </div>
        <div className="mt-auto pt-3">
          <p className="text-[1.65rem] font-semibold tabular-nums tracking-tight">
            {value}
          </p>
          {description ? (
            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );

  if (href) {
    return (
      <Link href={href} className="block h-full outline-none">
        {content}
      </Link>
    );
  }

  return content;
}
